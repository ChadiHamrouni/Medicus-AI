"""Persist the transcript of a finished WebRTC voice session into the conversation."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException

from medicus_common.core.logging_config import logger
from medicus_common.models.convo.realtime import SaveTranscriptsRequest
from medicus_common.models.user.user_core import User

from src.api.auth_dependencies import get_current_user
from src.security.scope import MAX_CLIENT_MESSAGE_CHARS, resolve_chat_scope
from src.services.session.active_messages import ActiveMessagesManager
from src.services.session.convo_service import ConvoService
from src.services.socketio_client import socketio_broadcast_service

router = APIRouter()
MAX_TRANSCRIPT_MESSAGES = 200


@router.post("/realtime/save-transcripts")
async def save_rtc_transcripts(request: SaveTranscriptsRequest, current_user: User = Depends(get_current_user)):
    scope = await resolve_chat_scope(current_user, request.convo_id)
    if len(request.messages) > MAX_TRANSCRIPT_MESSAGES:
        raise HTTPException(status_code=413, detail="Too many transcript messages")

    saved = failed = 0
    for msg in request.messages:
        role = msg.role if msg.role in ("user", "assistant") else "user"
        text = (msg.text or "")[:MAX_CLIENT_MESSAGE_CHARS]
        if not text.strip():
            continue
        saved_message = await ConvoService.add_convo_message(
            convo_id=scope.conversation_id,
            role=role,
            content_body={"type": "app", "text_io": text, "assistant": scope.assistant,
                          "convo_id": scope.conversation_id, "source": "webrtc"},
            processed_by_ai=(role == "assistant"),
        )
        if not saved_message:
            failed += 1
            continue
        saved += 1
        asyncio.create_task(
            ActiveMessagesManager.add_message(scope.conversation_id, {"role": role, "content": text}, status="ACTIVE")
        )
        asyncio.create_task(socketio_broadcast_service.broadcast_ai_message(scope.conversation_id, {
            "conversation_id": scope.conversation_id,
            "role": saved_message["role"],
            "content": saved_message["content"],
            "id": str(saved_message["id"]),
            "created_at": saved_message["created_at"],
            "processed_by_ai": role == "assistant",
        }))

    if failed:
        logger.warning(f"[REALTIME] {failed} transcript messages failed to save")
    return {"status": "success", "saved": saved, "failed": failed, "total": len(request.messages)}
