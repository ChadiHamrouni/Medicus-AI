"""Health Calendar models for medical_events_view materialized view.

This module provides Pydantic models for the Health Calendar which combines:
- Medical visits (appointments)
- Medical examinations (completed exams)
- Medical exam orders (scheduled exams)
- Medical procedures

CRITICAL DESIGN DECISIONS:
Events are a pure aggregation domain that unifies multiple clinical data sources.
Unlike domain-specific models (visits, exams, procedures), events are:
- Flat: Single list, not grouped by status or type
- Read-only: No write operations (events are created by source domains)
- Time-sorted: Deterministic ordering by date, time, id
- Not grouped: Filtering is client-side or via query params
- Reference-only: No embedded SOAP notes, exam results, or medications

Events serve as a chronological index to other domains, not a replacement for them.
"""

from typing import Optional, Literal, Any, Dict, List
from datetime import date, time, datetime
from pydantic import BaseModel, Field, ConfigDict


class MedicalEventEntry(BaseModel):
    """Semantic event entry for agent/API consumption.

    This model represents a medical event from the unified timeline.
    Events are flat, time-sorted, and serve as a chronological index to source domains.
    """
    event_id: int = Field(..., description="Unique event identifier")
    patient_id: int = Field(..., description="Patient ID")
    doctor_id: Optional[int] = Field(None, description="Doctor ID")
    doctor_name: Optional[str] = Field(None, description="Doctor's full name")

    event_date: date = Field(..., description="Event date")
    event_time: Optional[time] = Field(None, description="Event time (if scheduled)")
    event_location: Optional[str] = Field(None, description="Event location/address")

    event_type: Optional[str] = Field(
        None,
        description="Type of medical event"
    )
    event_name: Optional[str] = Field(None, description="Specific event name (visit_type/exam_type)")

    event_details: Optional[Dict[str, Any]] = Field(
        None,
        description="Event-specific details (JSONB)"
    )
    event_summary: Optional[str] = Field(
        None,
        description="Summary for completed exams"
    )
    healthcare_provider_name: Optional[str] = Field(
        None,
        description="Healthcare provider name"
    )

    status: Optional[str] = Field(
        None,
        description="Event status based on date (active/past)"
    )

    model_config = ConfigDict(extra='forbid')


class MedicalEventRecord(BaseModel):
    """Single medical event record from database.

    INTERNAL USE ONLY - for service/repository layer.
    Agents and APIs should use MedicalEventEntry instead.

    This model preserves the raw database structure from medical_events_view.
    """
    event_id: int
    patient_id: int
    doctor_id: int
    doctor_name: str

    event_date: date
    event_time: Optional[time] = None
    event_location: Optional[str] = None

    event_type: str
    event_name: str

    event_details: Optional[Dict[str, Any]] = None
    event_summary: Optional[str] = None
    healthcare_provider_name: Optional[str] = None

    status: str

    model_config = ConfigDict(from_attributes=True, extra='forbid')


class MedicalEventsResponse(BaseModel):
    """Response model for medical events timeline.

    This is the primary external contract for agents, APIs, and UI.
    Events are ordered chronologically (event_date DESC, event_time DESC, event_id DESC).

    Unlike other medical domains, events are not grouped by status.
    They are a flat, time-sorted list for timeline display.
    """
    patient_id: int = Field(..., description="Patient ID")
    events: List[MedicalEventEntry] = Field(
        default_factory=list,
        description="Medical events ordered chronologically (most recent first)"
    )
    total: int = Field(..., description="Total count of all events (not limited by pagination)")
    limit: int = Field(..., description="Maximum results per page")
    offset: int = Field(..., description="Number of results skipped")

    model_config = ConfigDict(extra='forbid')


class MedicalEventFilter(BaseModel):
    """Filter parameters for medical events queries."""

    patient_id: int
    event_types: Optional[list[Literal['visit', 'exam', 'exam_order', 'procedure']]] = Field(
        None,
        description="Filter by event types"
    )
    status: Optional[Literal['active', 'past']] = Field(
        None,
        description="Filter by status"
    )
    from_date: Optional[date] = Field(None, description="Filter events from this date")
    to_date: Optional[date] = Field(None, description="Filter events until this date")
    limit: int = Field(100, ge=1, le=500, description="Maximum results")
    offset: int = Field(0, ge=0, description="Results offset for pagination")


# ============================================================================
# PROJECTION LAYER - Converts persistence records into semantic read models
# ============================================================================

def build_event_entry(record: MedicalEventRecord) -> MedicalEventEntry:
    """Build external MedicalEventEntry from internal record.

    CRITICAL RULES:
    1. Preserve all fields as-is (no transformation needed)
    2. Events have no additional business logic beyond sorting
    3. Status is pre-computed in the view

    Args:
        record: Internal database record from medical_events_view

    Returns:
        MedicalEventEntry ready for external consumption
    """
    return MedicalEventEntry(
        event_id=record.event_id,
        patient_id=record.patient_id,
        doctor_id=record.doctor_id,
        doctor_name=record.doctor_name,
        event_date=record.event_date,
        event_time=record.event_time,
        event_location=record.event_location,
        event_type=record.event_type,
        event_name=record.event_name,
        event_details=record.event_details,
        event_summary=record.event_summary,
        healthcare_provider_name=record.healthcare_provider_name,
        status=record.status
    )


def sort_events(entries: List[MedicalEventEntry]) -> List[MedicalEventEntry]:
    """Sort events chronologically (most recent first) with deterministic tie-breaking.

    Sorting rules (in order of precedence):
    1. event_date DESC (most recent first)
    2. event_time DESC NULLS LAST (later time first, null times at end)
    3. event_id DESC (higher id first)

    This prevents UI flicker and pagination bugs when multiple events
    share the same date or date+time.

    Args:
        entries: List of MedicalEventEntry objects

    Returns:
        Sorted list (most recent first)
    """
    def sort_key(e: MedicalEventEntry):
        # Python sorts None as less than any value, so we need custom handling
        # for NULLS LAST behavior
        time_value = e.event_time if e.event_time is not None else time.min
        return (e.event_date, time_value, e.event_id)

    return sorted(entries, key=sort_key, reverse=True)
