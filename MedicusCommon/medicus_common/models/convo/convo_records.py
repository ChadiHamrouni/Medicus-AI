# =============================================================================
# src/models/convo_core.py - CLEAN AND SIMPLE VERSION
# =============================================================================
import json
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from medicus_common.models.convo.payload import AppPayload, CloudPayload
from .convo_core import MessageRole


class Attachment(BaseModel):
    type: str
    url: str
    description: Optional[str] = None

class MessageContent(BaseModel):
    format: str
    body: str
    attachments: Optional[List[Attachment]] = None

class PatientInfo(BaseModel):
    """Patient information for conversation list.

    Fields mapped from dialog.conversations_view:
    - name: patient_name (first_name || ' ' || last_name)
    - age: patient_current_age (calculated from dob)
    - gender: patient_gender
    """
    name: str
    image: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DoctorInfo(BaseModel):
    """Doctor information for conversation list.

    Fields mapped from dialog.conversations_view:
    - name: doctor_name (prefix + first_name + last_name)
    - specialty_name: doctor_specialty_name
    """
    name: str
    image: Optional[str] = None
    specialty_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    id: int
    conversation_id: UUID
    role: MessageRole
    content: Union[AppPayload, CloudPayload]
    created_at: datetime
    processed_by_ai: bool = False

    @classmethod
    def from_db_row(cls, row: dict) -> "Message":
        """
        Create a Message record from a database row.

        - Supports both AppPayload (current) and CloudPayload (legacy).
        - Handles content stored as JSON string or dict.
        """
        # Extract and normalize content
        content_dict = row.get("content", {})
        if isinstance(content_dict, str):
            content_dict = json.loads(content_dict)

        # Convert to payload model
        content = cls._parse_payload(content_dict, row["role"])

        return cls(
            id=row["id"],
            conversation_id=row["conversation_id"],
            role=MessageRole(row["role"]),
            content=content,
            created_at=row["created_at"],
            processed_by_ai=row.get("processed_by_ai", False),
        )

    @staticmethod
    def _parse_payload(content_dict: dict, role: str) -> Union[AppPayload, CloudPayload]:
        """
        Convert content dictionary to a payload model.
        """
        try:
            # First try AppPayload
            return AppPayload(**content_dict)
        except Exception:
            # Fallback to CloudPayload for legacy messages
            text_content = content_dict.get("text_io") or content_dict.get("body", "")
            default_message = "AI response" if role == MessageRole.ASSISTANT.value else "Message content"
            return CloudPayload(
                text_io=text_content,
                status_code=content_dict.get("status_code", 200),
                message=content_dict.get("message", default_message),
            )




