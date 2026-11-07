from pydantic import BaseModel, Field
from typing import List, Optional

class EmergencyAlertResponse(BaseModel):
    """Schema for the result of an emergency protocol activation."""
    status: str = Field(..., description="The status of the alert (e.g., 'activated')")
    message: str = Field(..., description="Human-readable confirmation message")
    protocol_id: str = Field(..., description="Unique tracking ID for the clinical emergency event")
    dispatched_at: str = Field(..., description="ISO timestamp of the dispatch")
    priority: str = Field("CRITICAL", description="The severity level of the alert")

class EmergencyAlertInput(BaseModel):
    """Schema for the input required to trigger an emergency."""
    reason: str = Field(..., description="Clinical justification for the emergency alert")
    location_detail: Optional[str] = Field("Unknown", description="Specific room or area within the facility")