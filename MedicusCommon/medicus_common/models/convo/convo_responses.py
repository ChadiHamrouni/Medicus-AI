# =============================================================================
# src/models/convo_core.py - CLEAN AND SIMPLE VERSION
# =============================================================================

from datetime import datetime
from typing import Optional, List, Union
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict

from medicus_common.models.convo.payload import AppPayload, CloudPayload
from medicus_common.models.convo.convo_core import AssistantType, ConversationState, UrgencyLevel
from medicus_common.models.convo.convo_records import PatientInfo, DoctorInfo, Message


class ConversationHead(BaseModel):
    """Conversation header information."""
    id: UUID
    user_id: int
    patient_id: Optional[int]
    doctor_id: Optional[int]
    assistant: AssistantType
    region_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    state: ConversationState = ConversationState.ACTIVE
    lastMessage: Optional[str] = None
    lastMessageTimestamp: Optional[datetime] = None
    patient: Optional[PatientInfo] = None
    doctor: Optional[DoctorInfo] = None
    mirror_conversation_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class MessagePaginatedResponse(BaseModel):
    """Paginated response for messages in a conversation."""
    results: List[Message]
    count: int = Field(description="Total number of messages")
    next: Optional[str] = Field(None, description="URL for next page")
    previous: Optional[str] = Field(None, description="URL for previous page")

    model_config = ConfigDict(from_attributes=True)


class MessageCreateRequest(BaseModel):
    """Request to create a new message."""
    payload: Union[AppPayload, CloudPayload]  # Remove discriminator

    @field_validator('payload')
    @classmethod
    def validate_payload(cls, v):
        if hasattr(v, 'has_input') and not v.has_input():
            raise ValueError("At least one content type must be provided")
        return v


class MessageResponse(BaseModel):
    """Response after creating a message."""
    message: Message


class ConversationListResponse(BaseModel):
    """Response for conversation list with pagination."""
    conversations: List[ConversationHead]
    total: int
    page: int
    page_size: int
    next: Optional[str] = None
    previous: Optional[str] = None


class ConversationContext(BaseModel):
    """
    AI context state for a conversation.

    Returned by GET /conversations/{id}/context.
    Contains compaction (AI long-term memory) and domain-specific summaries.
    Designed as the hydration payload for device-side SQLite cache.
    """
    conversation_id: UUID
    compact_summary: Optional[str] = Field(None, description="Latest compaction summary (AI long-term memory)")
    compact_to_message: Optional[int] = Field(None, description="Last message ID covered by latest compaction")
    medibrief_summary: Optional[str] = Field(None, description="Latest MediBrief clinical summary (doctor-facing)")
    mediexplain_summary: Optional[str] = Field(None, description="Latest MediExplain patient summary (patient-facing)")

    model_config = ConfigDict(from_attributes=True)


class ConversationSummary(BaseModel):
    """Simple conversation summary model."""
    conversation_id: UUID
    summary_text: str
    key_symptoms: List[str]
    urgency_level: UrgencyLevel
    message_count: int
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)