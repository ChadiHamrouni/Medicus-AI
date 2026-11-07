import asyncio
import json
from datetime import datetime
from typing import Optional

from medicus_common.core.config_ai import Config
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.convo.convo_core import MessageRole
from medicus_common.models.convo.convo_records import Message
from medicus_common.models.convo.convo_requests import MessageCreateRequest
from medicus_common.models.convo.convo_responses import MessagePaginatedResponse
from medicus_common.models.convo.payload import AppPayload
from medicus_common.storage import attachment_key, get_storage, normalize_key
from medicus_common.storage.access import share_vault_object_in_conversation, user_can_read_object

from src.services.access import OwnedConversation
from src.services.socketio_service import get_socketio_manager

_RETURNING = "RETURNING id, conversation_id, role, content, created_at, processed_by_ai"


class AttachmentNotAllowed(Exception):
    """The sender referenced a stored object they cannot access."""


def _message_event(message: Message, convo_id: str, **extra) -> dict:
    content = message.content.model_dump(mode="json") if hasattr(message.content, "model_dump") else message.content
    return {
        "id": str(message.id),
        "conversation_id": convo_id,
        "role": message.role,
        "content": content,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "processed_by_ai": message.processed_by_ai,
        **extra,
    }


async def _broadcast(convo_id: str, data: dict) -> None:
    try:
        await get_socketio_manager().broadcast_to_conversation(convo_id, "new_message", data)
    except Exception as e:
        logger.warning(f"Failed to broadcast message: {e}")


class MessageService:
    def __init__(self):
        self.default_page_size = Config().get("conversation", "messages_page_size", default=50)

    async def _insert_user_message(self, convo_id: str, content: dict) -> Message:
        row = await db_manager.fetchrow(
            f"INSERT INTO dialog.messages (conversation_id, role, content) VALUES ($1::uuid, $2, $3::jsonb) {_RETURNING}",
            convo_id, MessageRole.USER.value, json.dumps(content, default=str),
        )
        return Message.from_db_row(row)

    async def send_message(self, convo: OwnedConversation, req: MessageCreateRequest, user) -> Message:
        """Store a message typed by the user. Clients can never write assistant messages."""
        if not isinstance(req.payload, AppPayload):
            raise ValueError("Only app payloads can be sent by clients")

        payload = req.payload
        attachments = None
        if payload.attachments:
            attachments = []
            for att in payload.attachments:
                key = normalize_key(att.blob_path)
                if not await user_can_read_object(user.id, key, convo.visible_ids):
                    raise AttachmentNotAllowed(key)
                if not key.startswith("attachments/"):
                    await share_vault_object_in_conversation(user.id, key, convo.id)
                attachments.append(att.model_copy(update={"blob_path": key}))

        content = payload.model_copy(update={
            "convo_id": convo.id,
            "user_id": user.id,
            "sender_id": user.id,
            "assistant": convo.assistant,
            "patient_id": convo.patient_id,
            "doctor_id": convo.doctor_id,
            "attachments": attachments,
            # Never persist client-supplied AI memory or history.
            "compact_summary": None,
            "recent_messages": None,
        }).model_dump(mode="json", exclude_none=True)

        message = await self._insert_user_message(convo.id, content)
        await _broadcast(convo.id, _message_event(message, convo.id))
        return message

    async def get_messages(self, convo: OwnedConversation, since: Optional[datetime] = None,
                           page: int = 1, page_size: Optional[int] = None) -> MessagePaginatedResponse:
        """Newest-first page of messages. Fetches page_size + 1 rows to detect a next page."""
        page_size = page_size or self.default_page_size
        offset = (page - 1) * page_size
        params: list = [convo.id]
        query = "SELECT id, conversation_id, role, content, created_at, processed_by_ai FROM dialog.messages_view WHERE conversation_id = $1::uuid"
        if since:
            params.append(since)
            query += f" AND created_at > ${len(params)}"
        query += f" ORDER BY created_at DESC, id DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
        rows = await db_manager.fetch(query, *params, page_size + 1, offset)

        messages = []
        for row in rows[:page_size]:
            row_dict = dict(row)
            content = row_dict["content"]
            if isinstance(content, str):
                content = json.loads(content)
            if isinstance(content, dict) and isinstance(content.get("text_io"), dict):
                nested = content["text_io"]
                content["text_io"] = nested.get("text_io") or nested.get("body") or nested.get("message") or ""
            row_dict["content"] = content
            try:
                messages.append(Message.from_db_row(row_dict))
            except Exception as e:
                logger.error(f"Error parsing message {row['id']}: {e}")

        has_next = len(rows) > page_size
        suffix = f"&since={since.isoformat()}" if since else ""
        return MessagePaginatedResponse(
            results=messages,
            count=len(messages),
            next=f"?page={page + 1}&page_size={page_size}{suffix}" if has_next else None,
            previous=f"?page={page - 1}&page_size={page_size}{suffix}" if page > 1 else None,
            page=page,
            page_size=page_size,
            total_pages=0,
            has_more=has_next,
        )

    async def _store(self, convo_id: str, data: bytes, filename: str, content_type: str) -> str:
        key = attachment_key(convo_id, filename)
        await get_storage().put(key, data, content_type)
        return key

    async def send_message_with_media(self, convo: OwnedConversation, user, message_text: str,
                                      file_content: bytes, filename: str, content_type: str) -> Message:
        """
        Upload one file. Audio is only stored (the AI service transcribes it and
        persists the transcript); other files become a user message.
        """
        key = await self._store(convo.id, file_content, filename, content_type)
        base = {
            "type": "app", "text_io": message_text or "", "user_id": user.id, "sender_id": user.id,
            "assistant": convo.assistant, "convo_id": convo.id, "convo_status": "ACTIVE",
            "direct_message": False, "media_filename": filename, "media_content_type": content_type,
            "storage_status": "completed", "has_media": True, "blob_path": key, "blob_url": key,
        }

        if content_type.startswith("audio/"):
            content = {**base, "audio_io": key, "file_io": key}
            return Message(id=0, conversation_id=convo.id, role=MessageRole.USER.value, content=content,
                           created_at=datetime.utcnow(), processed_by_ai=False)

        message = await self._insert_user_message(convo.id, {**base, "file_io": key})
        await _broadcast(convo.id, _message_event(message, convo.id, has_media=True, media_filename=filename,
                                                 storage_status="completed"))
        return message

    async def send_message_with_multiple_attachments(self, convo: OwnedConversation, user, message_text: str,
                                                     attachments: list[tuple[bytes, str, str]]) -> Message:
        results = await asyncio.gather(
            *(self._store(convo.id, data, name, ctype) for data, name, ctype in attachments),
            return_exceptions=True,
        )
        processed = []
        for (_, name, ctype), result in zip(attachments, results):
            if isinstance(result, Exception):
                logger.error(f"Failed to store {name}: {result}")
                processed.append({"filename": name, "content_type": ctype, "status": "failed", "error": "upload failed"})
            else:
                processed.append({"filename": name, "content_type": ctype, "status": "completed",
                                  "blob_path": result, "blob_url": result})

        ok = [a for a in processed if a["status"] == "completed"]
        content = {
            "type": "app", "text_io": message_text or "", "user_id": user.id, "sender_id": user.id,
            "assistant": convo.assistant, "convo_id": convo.id, "convo_status": "ACTIVE",
            "direct_message": False, "attachments": processed,
            "storage_status": "completed" if len(ok) == len(processed) else ("partial_success" if ok else "failed"),
            "file_io": ok[0]["blob_path"] if ok else None,
        }
        message = await self._insert_user_message(convo.id, content)
        await _broadcast(convo.id, _message_event(message, convo.id, has_media=True, attachment_count=len(processed)))
        return message

    async def get_message_media_key(self, convo: OwnedConversation, message_id: int) -> Optional[str]:
        content = await db_manager.fetchval(
            "SELECT content FROM dialog.messages_view WHERE id = $1 AND conversation_id = ANY($2::uuid[])",
            message_id, convo.visible_ids,
        )
        if isinstance(content, str):
            content = json.loads(content)
        if not isinstance(content, dict) or not content.get("has_media"):
            return None
        key = content.get("blob_path") or content.get("blob_url")
        return normalize_key(key) if key else None


message_service = MessageService()
