from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SessionContext(BaseModel):
    """
    Session context for tools that need conversation routing and patient display info.

    This provides the actual conversation UUID (not hashed) and patient demographics
    for tools that perform navigation or display-related actions.

    Auto-injected from agent context - fields must match context dict keys.
    """

    # Conversation routing (actual UUID string, not hashed)
    conversation_id: Optional[str] = Field(
        None,
        description="The actual conversation UUID string for navigation and routing."
    )

    # Patient display info (for UI/navigation purposes)
    patient_name: Optional[str] = Field(
        None,
        description="Patient's display name for UI purposes."
    )

    patient_age: Optional[int] = Field(
        None,
        description="Patient's current age for display purposes."
    )

    patient_gender: Optional[str] = Field(
        None,
        description="Patient's gender for display purposes."
    )

    model_config = ConfigDict(extra="ignore")


class MedicalContext(BaseModel):
    """
    STRICT mutation context.
    IDs must come ONLY from system message.
    """

    patient_id: Optional[int] = Field(
        ...,
        description="Extract ONLY from system message '**Patient ID:** {id}'. Never fabricate."
    )

    doctor_id: Optional[int] = Field(
        ...,
        description="Extract ONLY from system message '**Doctor ID:** {id}'. Never fabricate."
    )

    healthcare_provider_id: Optional[int] = Field(
        None,
        description="Extract from system message if present, else null."
    )

    model_config = ConfigDict(extra="forbid")


class MedicalSupersedeContext(BaseModel):
    original_id: int = Field(
        ...,
        description="ID of the medical record being corrected."
    )
    new_status: Optional[str] = Field(..., description="New status (deleted or entered-in-error)")

    model_config = ConfigDict(extra="forbid")


