from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


# --- Pydantic Models ---

class AuditContext(BaseModel):
    """Context and traceability data for system actions (audit trail)."""
    actor_user_id: Optional[int] = Field(None, description="The ID of the authenticated user who initiated the action.")
    actor_role: str = Field("doctor", description="The role of the actor (e.g., 'doctor', 'patient', 'system').")
    convo_id: int = Field(..., description="The ID of the conversation source initiating the request.")
    message_id: int = Field(..., description="The ID of the specific message source initiating the request.")

    model_config = ConfigDict(extra='forbid')


