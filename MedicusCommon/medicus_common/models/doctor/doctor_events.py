# medicus_common/models/doctor/doctor_events.py
"""Doctor Events Models - matching doctors_events_view materialized view."""

from datetime import date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class DoctorEvent(BaseModel):
    """Model matching doctors_events_view materialized view schema.

    Represents medical events (visits and procedures) for a doctor's schedule.
    Combines data from medical_visits and medical_procedures tables.
    """

    # Core identifiers
    id: int = Field(..., description="Event ID (from medical_visits or medical_procedures)")
    doctor_id: int = Field(..., description="Doctor ID")
    patient_id: int = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient's full name")

    # Event timing
    event_date: date = Field(..., description="Date of the event")
    event_time: Optional[time] = Field(None, description="Time of the event")

    # Event details
    event_location: Optional[str] = Field(None, description="Location of the event")
    event_type: str = Field(..., description="Type of event: 'visit' or 'procedure'")
    event_name: Optional[str] = Field(None, description="Name/title of the event")
    event_details: Optional[Dict[str, Any]] = Field(None, description="Additional event details (JSONB)")
    event_summary: Optional[str] = Field(None, description="Summary or notes about the event")

    # Healthcare provider info
    healthcare_provider_name: Optional[str] = Field(None, description="Name of the healthcare provider")

    # Status
    status: str = Field(..., description="Event status: 'active' or 'past'")

    model_config = ConfigDict(
        extra='forbid',
        json_schema_extra={
            "example": {
                "id": 123,
                "doctor_id": 50019,
                "patient_id": 271,
                "patient_name": "John Doe",
                "event_date": "2026-01-15",
                "event_time": "14:30:00",
                "event_location": "123 Medical Center, Suite 201",
                "event_type": "visit",
                "event_name": "follow_up",
                "event_details": {"notes": "Routine checkup"},
                "event_summary": "Follow-up visit for blood pressure monitoring",
                "healthcare_provider_name": "City Medical Center",
                "status": "active"
            }
        }
    )


class DoctorEventsResponse(BaseModel):
    """Response model for doctor events list."""

    events: List[DoctorEvent] = Field(default_factory=list, description="List of events")
    total: int = Field(0, description="Total number of events")
    limit: int = Field(100, description="Query limit")
    offset: int = Field(0, description="Query offset")

    model_config = ConfigDict(extra='forbid')