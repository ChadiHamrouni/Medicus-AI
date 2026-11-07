"""
Server-side authorization for assistant turns.

The client sends a conversation id plus a lot of convenience fields
(patient_id, doctor_id, sender_id, ...). None of those are trusted: the
conversation row and the authenticated user decide who the patient and doctor
are. Everything downstream (context building, tools, persistence) must use the
resolved ChatScope.
"""

from dataclasses import dataclass
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.user.user_core import User

MAX_CLIENT_HISTORY_MESSAGES = 40
MAX_CLIENT_MESSAGE_CHARS = 8000
_ALLOWED_HISTORY_ROLES = {"user", "assistant"}


@dataclass(frozen=True)
class ChatScope:
    user_id: int
    actor_role: str                 # 'patient' or 'doctor' (who is typing)
    assistant: str                  # 'mediaid' or 'medidoc'
    conversation_id: str
    mirror_conversation_id: Optional[str]
    patient_id: Optional[int]
    doctor_id: Optional[int]


def _forbidden(detail: str = "You do not have access to this conversation") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def resolve_chat_scope(user: User, conversation_id: Optional[str]) -> ChatScope:
    """Authorize `user` on `conversation_id` and return the trusted scope."""
    if not conversation_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing conversation id")
    try:
        convo_uuid = UUID(str(conversation_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conversation id")

    row = await db_manager.fetchrow(
        """
        SELECT c.user_id, c.patient_id, c.doctor_id, c.assistant::text AS assistant,
               c.mirror_conversation_id, d.user_id AS doctor_user_id
        FROM dialog.conversations c
        LEFT JOIN public.doctors d ON d.id = c.doctor_id
        WHERE c.id = $1
        """,
        convo_uuid,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Each side of a patient<->doctor thread has its own row owned by that side.
    if row["user_id"] != user.id:
        logger.warning(f"[AUTHZ] user {user.id} denied on conversation {convo_uuid}")
        raise _forbidden()

    assistant = row["assistant"]
    if assistant == "medidoc":
        own_doctor_id = await db_manager.fetchval(
            "SELECT id FROM public.doctors WHERE user_id = $1 AND deleted_at IS NULL", user.id
        )
        if own_doctor_id is None or (row["doctor_id"] is not None and row["doctor_id"] != own_doctor_id):
            raise _forbidden()
        doctor_id, patient_id, actor_role = own_doctor_id, row["patient_id"], "doctor"
    else:
        patient_id = row["patient_id"]
        if patient_id is not None:
            owner = await db_manager.fetchval(
                "SELECT user_id FROM public.patients WHERE id = $1 AND deleted_at IS NULL", patient_id
            )
            if owner != user.id:
                raise _forbidden()
        doctor_id, actor_role = row["doctor_id"], "patient"

    mirror = row["mirror_conversation_id"]
    return ChatScope(
        user_id=user.id,
        actor_role=actor_role,
        assistant=assistant,
        conversation_id=str(convo_uuid),
        mirror_conversation_id=str(mirror) if mirror else None,
        patient_id=patient_id,
        doctor_id=doctor_id,
    )


def sanitize_client_history(messages: Optional[list[Any]]) -> list[dict[str, str]]:
    """
    Keep only plain user/assistant text turns from client-supplied history.

    Clients must never be able to smuggle `system`/`developer` messages or tool
    calls into the model input, which would bypass guardrails and instructions.
    """
    clean: list[dict[str, str]] = []
    for msg in (messages or [])[-MAX_CLIENT_HISTORY_MESSAGES:]:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role")
        content = msg.get("content")
        if role not in _ALLOWED_HISTORY_ROLES or not isinstance(content, str) or not content.strip():
            continue
        clean.append({"role": role, "content": content[:MAX_CLIENT_MESSAGE_CHARS]})
    return clean
