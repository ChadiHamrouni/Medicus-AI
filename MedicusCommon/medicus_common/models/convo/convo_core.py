# =============================================================================
# src/models/convo_core.py - CLEAN AND SIMPLE VERSION
# =============================================================================

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from enum import Enum


class AssistantType(str, Enum):
    """Assistant types - matches your existing enum."""
    MEDIAID = "mediaid"
    MEDIDOC = "medidoc"


# ConversationState in convo_core.py has values:
class ConversationState(str, Enum):
    """Conversation states."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    CLOSED = "closed"
    TEST = "test"

class MessageRole(str, Enum):
    """LLM message roles - matches your existing enum."""
    SYSTEM = "system"
    ASSISTANT = "assistant"  # Sara responses
    USER = "user"  # Patient/Doctor messages


class UrgencyLevel(str, Enum):
    """Medical urgency levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Conversation(BaseModel):
    id: UUID
    user_id: int
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    assistant: AssistantType
    state: ConversationState = ConversationState.ACTIVE
    updated_at: datetime



