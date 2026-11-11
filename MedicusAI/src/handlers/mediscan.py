import asyncio
from pathlib import Path
from typing import Tuple

from medicus_common.core.logging_config import logger
from medicus_common.models.convo.payload import AppPayload, CloudPayload
from medicus_common.storage import get_storage, guess_content_type

from src.handlers.helpers.mediscan.run_attachment import run_attachment
from src.services.session.active_messages import ActiveMessagesManager
from src.services.session.convo_service import ConvoService
from src.services.socketio_client import socketio_broadcast_service


def _attachment_key(attachment) -> str | None:
    if isinstance(attachment, dict):
        return attachment.get("blob_path")
    if isinstance(attachment, str):
        return attachment
    return getattr(attachment, "blob_path", None)


async def mediscan_handler(payload: AppPayload, redis=None) -> Tuple[CloudPayload, float]:
    """
    Attachment turn: load files from storage -> triage -> analyse -> save -> broadcast.

    Attachment keys must already be authorized for the caller (see api/route.py).
    """
    try:
        keys = [k for k in (_attachment_key(a) for a in (payload.attachments or [])) if k]
        if not keys:
            return CloudPayload(status_code=400, message="No attachments provided"), 0.0

        storage = get_storage()
        parts = []
        for i, key in enumerate(keys, 1):
            data = await storage.get(key)
            if data is None:
                parts.append(f"[Attachment {i}]\nThis file could not be found.")
                continue
            result = await run_attachment(
                data, guess_content_type(key), Path(key).suffix,
                audience="doctor" if payload.assistant == "medidoc" else "patient",
                user_text=payload.text_io if isinstance(payload.text_io, str) else None,
            )
            text = result.get("text") if result.get("status") == "ok" else result.get("reason")
            parts.append(text if len(keys) == 1 else f"[Attachment {i}]\n{text}")
        ai_text = "\n\n".join(parts)

        message_data = await ConvoService.add_convo_message(
            convo_id=payload.convo_id,
            role="assistant",
            content_body={"type": "app", "text_io": ai_text, "assistant": payload.assistant, "convo_id": payload.convo_id,
                          "source": "mediscan"},  # lets MediBrief tell document analyses from chat replies
            processed_by_ai=True,
        )

        if message_data:
            status = payload.convo_status.value if payload.convo_status else "ACTIVE"
            await ActiveMessagesManager.add_message(payload.convo_id, {"role": "assistant", "content": ai_text}, status=status)
            asyncio.create_task(socketio_broadcast_service.broadcast_ai_message(
                payload.convo_id,
                {
                    "conversation_id": payload.convo_id,
                    "role": message_data["role"],
                    "content": message_data["content"],
                    "id": str(message_data["id"]),
                    "created_at": message_data["created_at"],
                    "processed_by_ai": True,
                },
            ))

        return CloudPayload(text_io=ai_text, status_code=200, message="Processed"), 0.0

    except Exception as e:
        logger.error(f"MediScan failure: {e}", exc_info=True)
        return CloudPayload(status_code=400, message="Attachment processing failed"), 0.0
