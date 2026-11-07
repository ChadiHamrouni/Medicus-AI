import asyncio
from typing import Tuple

from medicus_common.core.logging_config import logger
from medicus_common.models.convo.payload import AppPayload, CloudPayload

from src.services.session.convo_service import ConvoService
from src.services.session.active_messages import ActiveMessagesManager
from src.services.patient.patient_context import get_patient_context
from src.services.doctor.doctor_context import get_doctor_context
from src.services.summarizing.compaction_service import _trigger_compaction
from src.handlers.helpers.medivox.transcribe_audio import transcribe_audio
from src.handlers.helpers.meditext.run_text import run_text
from src.handlers.helpers.common.agent_helper import build_agent_context, build_convo_context
from src.security.reply_filter import scrub_identifiers
from src.handlers.meditext import _names
from src.handlers.helpers.common.debug import debug_agent_result, debug_loaded_context, debug_turn_header
from src.handlers.helpers.medivox.persist_transcription import _save_empty_transcription_placeholder
from src.handlers.helpers.medivox.persist_transcription import _persist_and_broadcast

# O(1) Agent Mapping
from src.assistants.medidoc.medidoc_agent import medidoc
from src.assistants.docsolo.docsolo_agent import docsolo
from src.assistants.mediaid.mediaid_agent import mediaid
from src.assistants.medisolo.medisolo_agent import medisolo

AGENT_MAP = {
    "mediaid": lambda p: mediaid if p.doctor_id else medisolo,
    "medidoc": lambda p: medidoc if p.patient_id else docsolo,
}


async def medivox_handler(payload: AppPayload, redis=None) -> Tuple[CloudPayload, float]:
    """
    Voice handler: parallelises transcription + context retrieval.
    """
    import time
    t_start = time.time()

    try:
        convo_status_str = payload.convo_status.value if hasattr(payload.convo_status, 'value') else str(
            payload.convo_status)

        tasks = [
            transcribe_audio(payload.audio_io),
            ConvoService.load_history(payload.convo_id, convo_status_str),
            get_doctor_context(doctor_id=payload.doctor_id) if payload.doctor_id else asyncio.sleep(0, result=None),
            get_patient_context(patient_id=payload.patient_id) if payload.patient_id else asyncio.sleep(0, result=None),
        ]

        transcription, history_result, doc_ctx, pat_ctx = await asyncio.gather(*tasks, return_exceptions=True)

        # Unpack results — return_exceptions=True means failures are Exception objects
        if isinstance(transcription, Exception):
            logger.warning(f"[MEDIVOX] Transcription failed: {transcription}")
            transcription = None
        if isinstance(history_result, Exception):
            logger.warning(f"[MEDIVOX] Failed to load history: {history_result}")
            history, inactive_context = [], None
        else:
            history, inactive_context = history_result
        if not inactive_context:
            history = payload.recent_messages or []
        if isinstance(doc_ctx, Exception):
            logger.warning(f"[MEDIVOX] Failed to load doctor context: {doc_ctx}")
            doc_ctx = None
        if isinstance(pat_ctx, Exception):
            logger.warning(f"[MEDIVOX] Failed to load patient context: {pat_ctx}")
            pat_ctx = None

        debug_loaded_context(pat_ctx, doc_ctx)

        if not transcription or len(transcription.strip()) < 2:
            asyncio.create_task(_save_empty_transcription_placeholder(payload))
            return CloudPayload(status_code=400, message="Empty transcription"), time.time() - t_start

        agent_resolver = AGENT_MAP.get(payload.assistant)
        agent = agent_resolver(payload) if agent_resolver else mediaid

        # Resolve compact context from payload (ACTIVE/NEW) or DB (INACTIVE)
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

        convo_ctx_dict = {
            "recent_messages": history,
            "compact_summary": compact_summary,
            "conversation_id": payload.convo_id,
            "mirror_conversation_id": payload.mirror_convo_id,
            "medibrief_summary": medibrief_summary,
            "mediexplain_summary": mediexplain_summary,
        }

        system_message = build_convo_context(
            patient_context=pat_ctx,
            doctor_context=doc_ctx,
            convo_context=convo_ctx_dict,
            assistant=payload.assistant,
        )

        agent_context = build_agent_context(payload, pat_ctx)
        enriched_history = [system_message] + history

        turn_number = len(history) // 2 + 1
        debug_turn_header(turn_number, f"[VOICE] {transcription.strip()}")

        logger.info(f"[MEDIVOX] Agent: {agent.name}, History: {len(enriched_history)}")

        result = await run_text(
            text_input=transcription,
            agent=agent,
            history=enriched_history,
            context=agent_context,
        )

        if not result:
            raise RuntimeError("Agent returned no result")

        if isinstance(result, str):  # guardrail refusal
            ai_text = result
        else:
            debug_agent_result(result)
            ai_text = scrub_identifiers(result.final_output, *_names(pat_ctx, doc_ctx))

        asyncio.create_task(_persist_and_broadcast(payload, ai_text, transcription))
        asyncio.create_task(
            _trigger_compaction(
                convo_id=payload.convo_id,
                compact_to_message=compact_to_message,
                compact_summary=compact_summary,
            )
        )

        handler_time = time.time() - t_start
        return CloudPayload(text_io=ai_text, status_code=200), handler_time

    except Exception as exc:
        logger.error(f"[MEDIVOX] Handler failure: {exc}", exc_info=True)
        handler_time = time.time() - t_start
        return CloudPayload(status_code=400, message=str(exc)), handler_time
