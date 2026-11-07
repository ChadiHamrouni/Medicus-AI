import time

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.convo.payload import AppPayload
from medicus_common.models.user.user_core import User
from medicus_common.storage import normalize_key
from medicus_common.storage.access import user_can_read_object

from src.api.auth_dependencies import get_current_user
from src.handlers.mediscan import mediscan_handler
from src.handlers.meditext import meditext_handler
from src.handlers.medivox import medivox_handler
from src.security.scope import ChatScope, resolve_chat_scope, sanitize_client_history

router = APIRouter()


async def _authorized_key(key: str, scope: ChatScope) -> str:
    """Normalize a client-supplied storage key and verify the caller may read it."""
    try:
        key = normalize_key(key)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid attachment reference")
    conversations = [scope.conversation_id] + ([scope.mirror_conversation_id] if scope.mirror_conversation_id else [])
    if not await user_can_read_object(scope.user_id, key, conversations):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Attachment not accessible")
    return key


async def _trusted_payload(payload: AppPayload, scope: ChatScope) -> AppPayload:
    """Replace every identity/context field the client sent with server-verified values."""
    audio_key = await _authorized_key(payload.audio_io, scope) if payload.audio_io else None
    attachments = None
    if payload.attachments:
        attachments = [
            a.model_copy(update={"blob_path": await _authorized_key(a.blob_path, scope)})
            for a in payload.attachments
        ]

    details = await db_manager.fetchrow(
        "SELECT compact_summary, compact_to_message FROM dialog.conversation_details_view WHERE id = $1::uuid",
        scope.conversation_id,
    )
    return payload.model_copy(update={
        "convo_id": scope.conversation_id,
        "user_id": scope.user_id,
        "sender_id": scope.user_id,
        "assistant": scope.assistant,
        "patient_id": scope.patient_id,
        "doctor_id": scope.doctor_id,
        "mirror_convo_id": scope.mirror_conversation_id,
        "recent_messages": sanitize_client_history(payload.recent_messages),
        "compact_summary": details["compact_summary"] if details else None,
        "compact_to_message": details["compact_to_message"] if details else None,
        "audio_io": audio_key,
        "attachments": attachments,
    })


@router.post("/chat")
async def chat(payload: AppPayload, current_user: User = Depends(get_current_user)):
    """Route an audio, attachment or text turn to the matching handler."""
    scope = await resolve_chat_scope(current_user, payload.convo_id)
    payload = await _trusted_payload(payload, scope)

    t_start = time.time()
    handler_type = "TEXT"
    try:
        if payload.audio_io:
            handler_type = "AUDIO"
            result, _ = await medivox_handler(payload, None)
        elif payload.attachments:
            handler_type = "FILE"
            result, _ = await mediscan_handler(payload, None)
        else:
            result, _ = await meditext_handler(payload)
    except Exception:
        logger.exception(f"/chat [{handler_type}] failed for conversation {scope.conversation_id}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"status_code": 500, "response": "The assistant could not process this message."},
        )

    logger.info(f"/chat [{handler_type}] {result.status_code} in {time.time() - t_start:.2f}s")
    if result.status_code == 200:
        return JSONResponse(status_code=status.HTTP_200_OK, content={"status_code": 200, "text_io": result.text_io})

    logger.error(f"/chat [{handler_type}] handler error: {result.message}")
    return JSONResponse(
        status_code=result.status_code,
        content={"status_code": result.status_code, "response": "The assistant could not process this message."},
    )
