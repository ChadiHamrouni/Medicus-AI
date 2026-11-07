# ============================================================
# FILE: src/handlers/meditext.py
# ============================================================

import asyncio
from typing import Tuple

from medicus_common.models.convo.payload import AppPayload, CloudPayload
from medicus_common.core.logging_config import logger

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


async def meditext_handler(payload: AppPayload) -> Tuple[CloudPayload, float]:
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

        # ----------------------------------------------------------
        # 5. Run agent
        # ----------------------------------------------------------
        if not payload.text_io or not payload.text_io.strip():
            raise ValueError("No text input")

        text_input = payload.text_io.strip()
        turn_number = len(recent_messages) // 2 + 1
        debug_turn_header(turn_number, text_input)

        result = await run_text(
            text_input=text_input,
            agent=agent,
            history=enriched_history,
            context=agent_context,
        )

        if not result:
            raise RuntimeError("Agent returned no result")

        # Guardrail tripwire returns a plain string refusal message
        if isinstance(result, str):
            handler_time = time.time() - handler_start
            return CloudPayload(text_io=result, status_code=200), handler_time

        debug_agent_result(result)
        ai_text = result.final_output

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
