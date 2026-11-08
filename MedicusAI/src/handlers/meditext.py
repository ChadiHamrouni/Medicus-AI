# ============================================================
# FILE: src/handlers/meditext.py
# ============================================================

import asyncio
import re
import json
import time

from agents.tool_context import ToolContext
from typing import Optional, Tuple

from medicus_common.models.convo.payload import AppPayload, CloudPayload
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.llm import get_agent_model, get_model_settings

from src.assistants.medidoc.medidoc_agent import medidoc
from src.assistants.docsolo.docsolo_agent import docsolo
from src.assistants.mediaid.mediaid_agent import mediaid
from src.assistants.medisolo.medisolo_agent import medisolo
from src.services.session.convo_service import ConvoService
from src.services.patient.patient_context import get_patient_context
from src.services.doctor.doctor_context import get_doctor_context
from src.services.summarizing.compaction_service import _trigger_compaction
from src.handlers.helpers.common.agent_helper import build_convo_context, build_agent_context
from src.handlers.helpers.meditext.run_text import run_text
from src.services.socketio_client import socketio_broadcast_service
from src.security.reply_filter import scrub_identifiers
from src.guardrails.input_guardrail import guardrail_model_role
from src.tools.mediknowledge.context import knowledge_context
from src.handlers.helpers.common.debug import (
    debug_payload_ids,
    debug_loaded_context,
    debug_conversation_history,
    debug_turn_header,
    debug_agent_result,
)

# O(1) agent resolution
AGENT_MAP = {
    "mediaid": lambda p: mediaid if p.doctor_id else medisolo,
    "medidoc": lambda p: medidoc if p.patient_id else docsolo,
}


async def meditext_handler(payload: AppPayload, model_role: Optional[str] = None) -> Tuple[CloudPayload, float]:
    """
    Core text turn handler.

    Flow:
      1. Agent selection
      2. Parallel I/O: history + doctor/patient contexts
      3. Build system + conversation context
      4. Run agent
      5. Persist AI message
      6. Non-blocking: Socket.IO broadcast + compaction check
    """
    import time
    handler_start = time.time()

    try:
        if not payload.convo_id:
            return CloudPayload(status_code=400, message="Missing convo_id"), 0.0

        # ----------------------------------------------------------
        # 1. Agent selection
        # ----------------------------------------------------------
        agent_resolver = AGENT_MAP.get(payload.assistant)
        if not agent_resolver:
            return CloudPayload(status_code=400, message="Invalid assistant"), 0.0
        agent = agent_resolver(payload)
        if model_role:
            guardrail_model_role.set(model_role)
            # Same agent (instructions, tools, guardrails) on another model, e.g. the live-voice model.
            agent = agent.clone(model=get_agent_model(model_role), model_settings=get_model_settings(
                model_role, max_tokens=agent.model_settings.max_tokens, tools=True))

        debug_payload_ids(payload)

        # ----------------------------------------------------------
        # 2. Parallel I/O: recent_messages (DB for INACTIVE, payload for ACTIVE/NEW) + contexts
        # ----------------------------------------------------------
        history_task = ConvoService.load_history(payload.convo_id, payload.convo_status.value)
        doc_ctx_task = (
            get_doctor_context(doctor_id=payload.doctor_id)
            if payload.doctor_id
            else asyncio.sleep(0, result=None)
        )
        pat_ctx_task = (
            get_patient_context(patient_id=payload.patient_id)
            if payload.patient_id
            else asyncio.sleep(0, result=None)
        )

        history_result, doctor_context, patient_context = await asyncio.gather(
            history_task, doc_ctx_task, pat_ctx_task, return_exceptions=True
        )

        # Unpack — load_history returns (db_messages, inactive_context)
        # db_messages is populated only for INACTIVE; empty list for NEW/ACTIVE
        if isinstance(history_result, Exception):
            logger.warning(f"[MEDITEXT] Failed to load history: {history_result}")
            db_messages, inactive_context = [], None
        else:
            db_messages, inactive_context = history_result

        # Resolve the uncompacted message window sent to OpenAI:
        # INACTIVE → loaded from DB (messages after compact boundary)
        # ACTIVE/NEW → rolling window sent by client (no DB hit)
        if inactive_context:
            recent_messages = db_messages
        else:
            recent_messages = payload.recent_messages or []

        # Safety net: ACTIVE but client lost state (app restart, etc.)
        if not inactive_context and not recent_messages and payload.convo_status.value == "ACTIVE":
            logger.warning(f"[MEDITEXT] ACTIVE with empty context -- falling back to DB")
            db_messages, inactive_context = await ConvoService.load_history(payload.convo_id, "INACTIVE")
            if inactive_context:
                recent_messages = db_messages

        if isinstance(doctor_context, Exception):
            logger.warning(f"[MEDITEXT] Failed to load doctor context: {doctor_context}")
            doctor_context = None
        if isinstance(patient_context, Exception):
            logger.warning(f"[MEDITEXT] Failed to load patient context: {patient_context}")
            patient_context = None

        debug_loaded_context(patient_context, doctor_context, payload.assistant)
        debug_conversation_history(recent_messages, payload.assistant)

        # ----------------------------------------------------------
        # 3. Resolve compact context from payload (ACTIVE/NEW) or DB (INACTIVE)
        # ----------------------------------------------------------
        if inactive_context:
            compact_summary = inactive_context["compact_summary"]
            compact_to_message = inactive_context["compact_to_message"]
            medibrief_summary = inactive_context["medibrief_summary"]
            mediexplain_summary = inactive_context["mediexplain_summary"]
        else:
            compact_summary = payload.compact_summary
            compact_to_message = payload.compact_to_message
            medibrief_summary = None
            mediexplain_summary = None

        # ----------------------------------------------------------
        # 4. Build system + conversation context
        # ----------------------------------------------------------
        convo_context = {
            "recent_messages": recent_messages,
            "compact_summary": compact_summary,
            "conversation_id": payload.convo_id,
            "mirror_conversation_id": payload.mirror_convo_id,
            "medibrief_summary": medibrief_summary,
            "mediexplain_summary": mediexplain_summary,
        }

        system_message = build_convo_context(
            patient_context=patient_context,
            doctor_context=doctor_context,
            convo_context=convo_context,
            assistant=payload.assistant,
        )

        agent_context = build_agent_context(payload, patient_context)
        enriched_history = [system_message] + recent_messages
        if payload.assistant == "mediaid" and payload.doctor_id:
            # Ground answers about the practice in the doctor's own published material.
            knowledge = await knowledge_context(payload.doctor_id, payload.text_io or "")
            if knowledge:
                enriched_history.insert(1, knowledge)

        # ----------------------------------------------------------
        # 5. Run agent
        # ----------------------------------------------------------
        if not payload.text_io or not payload.text_io.strip():
            raise ValueError("No text input")

        text_input = payload.text_io.strip()
        turn_number = len(recent_messages) // 2 + 1

        # The app stores the user's message through MedicusConvo first and passes its id.
        # Any other client (web, scripts, integrations) gets it stored here, so the
        # conversation history never shows answers without questions.
        await _ensure_user_message_saved(payload, text_input)
        debug_turn_header(turn_number, text_input)

        result = await run_text(
            text_input=text_input,
            agent=agent,
            history=enriched_history,
            context=agent_context,
        )

        if not result:
            raise RuntimeError("Agent returned no result")

        # Guardrail tripwire returns a plain string refusal message. Persist and broadcast
        # it like any reply so it survives a reload.
        if isinstance(result, str):
            await _save_and_broadcast_reply(payload, result)
            handler_time = time.time() - handler_start
            return CloudPayload(text_io=result, status_code=200), handler_time

        debug_agent_result(result)
        p_name, d_name = _names(patient_context, doctor_context)
        ai_text = scrub_identifiers(result.final_output, patient_name=p_name, doctor_name=d_name)
        await _ensure_emergency_escalated(agent, agent_context, result, ai_text)
        result, ai_text = await _verify_claimed_actions(
            agent, agent_context, enriched_history, text_input, result, ai_text, p_name, d_name)
        # ----------------------------------------------------------
        # 6. Persist AI message
        # ----------------------------------------------------------
        saved_message = await ConvoService.add_convo_message(
            convo_id=payload.convo_id,
            role="assistant",
            content_body={
                "type": "app",
                "text_io": ai_text,
                "assistant": payload.assistant,
                "convo_id": payload.convo_id,
            },
            processed_by_ai=True,
        )

        # ----------------------------------------------------------
        # 7. Non-blocking post-turn tasks
        # ----------------------------------------------------------
        if saved_message:
            asyncio.create_task(
                socketio_broadcast_service.broadcast_ai_message(
                    payload.convo_id,
                    {
                        "conversation_id": payload.convo_id,
                        "role": saved_message["role"],
                        "content": saved_message["content"],
                        "id": str(saved_message["id"]),
                        "created_at": saved_message["created_at"],
                        "processed_by_ai": True,
                    },
                )
            )
            asyncio.create_task(
                _trigger_compaction(
                    convo_id=payload.convo_id,
                    compact_to_message=compact_to_message,
                    compact_summary=compact_summary,
                )
            )

        handler_time = time.time() - handler_start
        return CloudPayload(text_io=ai_text, status_code=200), handler_time

    except Exception as exc:
        logger.error(f"[MEDITEXT] Handler failure: {exc}", exc_info=True)
        handler_time = time.time() - handler_start
        return CloudPayload(status_code=400, message=str(exc)), handler_time


async def _ensure_user_message_saved(payload: AppPayload, text: str) -> None:
    if payload.message_id:
        exists = await db_manager.fetchval(
            "SELECT 1 FROM dialog.messages WHERE id = $1 AND conversation_id = $2::uuid AND role = 'user'",
            payload.message_id, payload.convo_id,
        )
        if exists:
            return
    saved = await ConvoService.add_convo_message(
        convo_id=payload.convo_id,
        role="user",
        content_body={"type": "app", "text_io": text, "assistant": payload.assistant, "convo_id": payload.convo_id},
    )
    if saved:
        asyncio.create_task(socketio_broadcast_service.broadcast_ai_message(payload.convo_id, {
            "conversation_id": payload.convo_id, "role": saved["role"], "content": saved["content"],
            "id": str(saved["id"]), "created_at": saved["created_at"], "processed_by_ai": False,
        }))


async def _save_and_broadcast_reply(payload: AppPayload, text: str) -> None:
    saved = await ConvoService.add_convo_message(
        convo_id=payload.convo_id,
        role="assistant",
        content_body={"type": "app", "text_io": text, "assistant": payload.assistant, "convo_id": payload.convo_id},
        processed_by_ai=True,
    )
    if saved:
        asyncio.create_task(socketio_broadcast_service.broadcast_ai_message(payload.convo_id, {
            "conversation_id": payload.convo_id, "role": saved["role"], "content": saved["content"],
            "id": str(saved["id"]), "created_at": saved["created_at"], "processed_by_ai": True,
        }))

def _names(patient_ctx, doctor_ctx):
    p = " ".join(x for x in (getattr(patient_ctx, 'first_name', None), getattr(patient_ctx, 'last_name', None)) if x) or None
    d = " ".join(x for x in (getattr(doctor_ctx, 'first_name', None), getattr(doctor_ctx, 'last_name', None)) if x) or None
    return p, d


_LEVEL3 = re.compile(r"triage\s*level\s*[:\-]?\s*3|level\s*3\s*[\u2014\-:]\s*emergency", re.IGNORECASE)


async def _ensure_emergency_escalated(agent, context, result, reply: str) -> None:
    """Safety net: a reply that classifies the turn as Triage Level 3 must have escalated.

    The triage skill requires calling trigger_emergency_protocol immediately at Level 3.
    Smaller models sometimes write the classification but skip the call; in that case
    the server makes it, through the same guarded tool (trusted identity, audit trail).
    """
    if not _LEVEL3.search(reply or ""):
        return
    if any(getattr(getattr(item, "raw_item", None), "name", None) == "trigger_emergency_protocol"
           for item in (getattr(result, "new_items", None) or [])):
        return
    tool = next((t for t in agent.tools if getattr(t, "name", None) == "trigger_emergency_protocol"), None)
    if tool is None:
        return
    args = json.dumps({"emergency_data": {
        "reason": "Assistant classified the conversation as Triage Level 3 (emergency); escalated automatically.",
        "location_detail": None,
    }})
    try:
        await tool.on_invoke_tool(
            ToolContext(context=context, tool_name=tool.name, tool_call_id="auto-escalation", tool_arguments=args), args)
        logger.warning("[TRIAGE] Level 3 reply without an emergency tool call: escalated automatically")
    except Exception:
        logger.exception("[TRIAGE] automatic emergency escalation failed")


# "has been cancelled", "I've created", "successfully booked", "is now marked as completed"...
_ACTION_CLAIM = re.compile(
    r"\b(?:has|have|had)\s+been\b[^.?!\n]{0,40}?\b(?:created|cancell?ed|deleted|booked|scheduled|recorded|added|"
    r"updated|marked|closed|opened|prescribed|ordered|saved|documented|finalized|invalidated|rescheduled|removed|"
    r"activated|triggered)\b"
    r"|\bI(?:'ve| have)\s+(?:now\s+|successfully\s+|just\s+)?(?:created|cancell?ed|deleted|booked|scheduled|recorded|"
    r"added|updated|marked|closed|opened|prescribed|ordered|saved|documented|finalized|invalidated|rescheduled|removed)\b"
    r"|\bsuccessfully\s+(?:created|cancell?ed|deleted|booked|scheduled|recorded|added|updated|closed|opened|"
    r"prescribed|ordered|saved|documented|finalized|invalidated|rescheduled|removed)\b",
    re.IGNORECASE,
)
# The user's message must ask for a change; otherwise "has been scheduled" just describes data.
_ACTION_REQUEST = re.compile(
    r"\b(?:book|cancel|record|add|prescribe|create|open|close|schedule|reschedule|delete|remove|mark|write|"
    r"update|order|trigger|correct|invalidate|log|note|finali[sz]e|report)\b", re.IGNORECASE)
_READ_ONLY_PREFIXES = ("get_", "show_", "find_", "search_")
_READ_ONLY_TOOLS = {"medibrief_summarize", "mediexplain_explain"}

_VERIFY_NOTE = (
    "System check: your previous reply said an action was completed, but no tool was called, "
    "so nothing was saved. Call the correct tool now to actually perform the action the user asked for. "
    "If you cannot, tell the user plainly that it was not done. Do not claim success without a tool call."
)
_NOT_DONE = ("I wasn't able to complete that action, so nothing was changed. "
             "Please try again, or rephrase what you'd like me to do.")


def _called_tools(result) -> list[str]:
    return [getattr(getattr(i, "raw_item", None), "name", None)
            for i in (getattr(result, "new_items", None) or [])
            if getattr(getattr(i, "raw_item", None), "name", None)]


def _is_write(name: str) -> bool:
    return not name.startswith(_READ_ONLY_PREFIXES) and name not in _READ_ONLY_TOOLS


async def _verify_claimed_actions(agent, context, history, text_input, result, reply, p_name, d_name):
    """Never let the assistant claim an action it did not perform.

    Small models sometimes answer "the prescription has been cancelled" without calling
    any tool. If a reply claims an action and no write tool ran this turn, retry once with
    an explicit correction; if the retry still performs nothing, say so honestly.
    """
    if (not _ACTION_REQUEST.search(text_input or "") or not _ACTION_CLAIM.search(reply or "")
            or any(_is_write(n) for n in _called_tools(result))):
        return result, reply
    if not any(_is_write(getattr(t, "name", "")) for t in agent.tools):
        return result, reply

    logger.warning("[VERIFY] reply claimed an action without a write tool call: retrying once")
    retry_agent = agent.clone(input_guardrails=[])  # the correction is ours, not user input
    retry = await run_text(
        text_input=_VERIFY_NOTE,
        agent=retry_agent,
        history=history + [{"role": "user", "content": text_input}, {"role": "assistant", "content": reply}],
        context=context,
    )
    if retry and not isinstance(retry, str) and any(_is_write(n) for n in _called_tools(retry)):
        return retry, scrub_identifiers(retry.final_output, patient_name=p_name, doctor_name=d_name)
    logger.warning("[VERIFY] retry performed no action: replying that nothing was done")
    return result, _NOT_DONE
