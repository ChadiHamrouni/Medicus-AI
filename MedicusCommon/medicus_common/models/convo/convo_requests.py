# =============================================================================
# src/models/convo_core.py - CLEAN AND SIMPLE VERSION
# =============================================================================

from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

from medicus_common.models.convo.payload import AppPayload
from medicus_common.models.convo.convo_core import AssistantType

class ConversationCreateRequest(BaseModel):
    """Request to create a new conversation."""
    assistant: AssistantType
    doctor_id: Optional[int] = Field(None, gt=0)
    patient_id: Optional[int] = Field(None, gt=0)
    doctor2_id: Optional[int] = Field(None, gt=0, description="Second doctor ID for doctor-doctor conversations")

    @field_validator('doctor2_id')
    @classmethod
    def validate_doctor_conversation(cls, v, info):
        """Ensure doctor2_id is only set when doctor_id is also set."""
        doctor_id = info.data.get('doctor_id')
        patient_id = info.data.get('patient_id')

        if v is not None:
            if doctor_id is None:
                raise ValueError("doctor2_id can only be set when doctor_id is provided")
            if patient_id is not None:
                raise ValueError("Cannot set both patient_id and doctor2_id")

        return v


class MessageCreateRequest(BaseModel):
    """Request to create a new message."""
    payload: AppPayload  # Only use AppPayload since CloudPayload is for internal use

    @field_validator('payload')
    @classmethod
    def validate_payload(cls, v):
        if hasattr(v, 'has_input') and not v.has_input():
            raise ValueError("At least one content type must be provided")
        return v


