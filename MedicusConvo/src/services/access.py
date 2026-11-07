"""Conversation-level authorization shared by REST and Socket.IO handlers."""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status

from medicus_common.core.database import db_manager

from src.services.auth_service import get_current_user


@dataclass(frozen=True)
class OwnedConversation:
    id: str
    user_id: int
    patient_id: Optional[int]
    doctor_id: Optional[int]
    assistant: str
    mirror_conversation_id: Optional[str]

    @property
    def visible_ids(self) -> list[str]:
        """This conversation plus its mirror (the other participant's copy)."""
        return [self.id] + ([self.mirror_conversation_id] if self.mirror_conversation_id else [])


async def load_owned_conversation(convo_id: UUID | str, user_id: int) -> Optional[OwnedConversation]:
    row = await db_manager.fetchrow(
        """SELECT id, user_id, patient_id, doctor_id, assistant::text AS assistant, mirror_conversation_id
           FROM dialog.conversations WHERE id = $1::uuid""",
        str(convo_id),
    )
    if row is None or row["user_id"] != user_id:
        return None
    return OwnedConversation(
        id=str(row["id"]),
        user_id=row["user_id"],
        patient_id=row["patient_id"],
        doctor_id=row["doctor_id"],
        assistant=row["assistant"],
        mirror_conversation_id=str(row["mirror_conversation_id"]) if row["mirror_conversation_id"] else None,
    )


async def owned_conversation(convo_id: UUID, user=Depends(get_current_user)) -> OwnedConversation:
    """FastAPI dependency: 404 unless the caller owns `convo_id` (no existence oracle)."""
    convo = await load_owned_conversation(convo_id, user.id)
    if convo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return convo
