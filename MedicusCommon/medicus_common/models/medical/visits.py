"""Medical Visits models for MedicusCommon.

This module provides Pydantic models for medical visits using a semantic,
status-based approach that matches the UI contract and agent reasoning patterns.

Status categorization:
- upcoming: Visits scheduled for the future
- ongoing: Visits currently in progress
- past: Visits that have occurred

CRITICAL DESIGN RULE:
Status enums are domain-specific and must NEVER be reused across domains.
- VisitStatus ≠ ProcedureStatus ≠ ExamStatus
This prevents false equivalence and maintains semantic precision.

Note: This is separate from timeline events. Timeline shows visits as generic events,
while this module provides visit-specific semantic contracts.
"""

from typing import Optional, List, Literal
from datetime import datetime, UTC
from pydantic import BaseModel, Field, ConfigDict, computed_field


# Type alias for visit status
VisitStatus = Literal["upcoming", "ongoing", "past"]


class TimeSlot(BaseModel):
    """Simple time slot model for appointment scheduling.

    Used for representing available appointment slots.
    """
    start: datetime = Field(..., description="Slot start time")
    end: datetime = Field(..., description="Slot end time")

    model_config = ConfigDict(extra='forbid')

    @computed_field  # type: ignore[prop-decorator]
    @property
    def label(self) -> str:
        """Human-readable slot, e.g. "Monday, November 16, 2026, 09:00-13:00 UTC".

        Spelling out the weekday stops smaller models from computing it (wrongly)
        from the ISO date when they talk to the user.
        """
        tz = self.start.tzname() or "UTC"
        return f"{self.start:%A, %B} {self.start.day}, {self.start:%Y, %H:%M}-{self.end:%H:%M} {tz}"


class MedicalVisitEntry(BaseModel):
    """Semantic visit entry for agent/API consumption.

    This model represents a medical visit with explicit lifecycle status
    instead of requiring time inference. It maps to UI sections and agent reasoning patterns.

    This is the clinical view of a visit, distinct from its timeline event representation.
    """
    id: int = Field(..., description="Visit record ID")

    # Scheduling
    start_time: datetime = Field(..., description="Scheduled start time")
    end_time: Optional[datetime] = Field(None, description="Scheduled end time")

    # Status (semantic, projected)
    status: VisitStatus = Field(..., description="Derived visit status (upcoming, ongoing, or past)")

    # Visit info
    visit_type: Optional[str] = Field(None, description="Type of visit (e.g., consultation, follow-up)")
    visit_details: Optional[str] = Field(None, description="Details or purpose of the visit")

    # Provenance
    doctor_name: str = Field(..., description="Doctor conducting the visit")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def when(self) -> str:
        """Human-readable date with the weekday spelled out, so models don't compute it."""
        end = f"-{self.end_time:%H:%M}" if self.end_time else ""
        return f"{self.start_time:%A, %B} {self.start_time.day}, {self.start_time:%Y, %H:%M}{end} {self.start_time.tzname() or 'UTC'}"
    healthcare_provider_name: Optional[str] = Field(None, description="Healthcare provider/facility")

    source: Optional[Literal["system", "clinician", "imported"]] = Field(
        None,
        description="Source of the visit record"
    )

    model_config = ConfigDict(extra='forbid')


class MedicalVisitCounts(BaseModel):
    """Counts of visits by status.

    Explicitly defines what is counted to eliminate agent inference.
    """
    upcoming: int = Field(..., description="Count of upcoming visits")
    ongoing: int = Field(..., description="Count of ongoing visits")
    past: int = Field(..., description="Count of past visits")
    total: int = Field(..., description="Total count across all visits")

    model_config = ConfigDict(extra='forbid')


class MedicalVisitsResponse(BaseModel):
    """Response model for visits grouped by status.

    This is the primary external contract for agents, APIs, and UI.
    Visits are grouped by their semantic status to match UI sections
    and eliminate agent inference logic.

    Sorting rules:
    - upcoming: ordered by start_time ASC (soonest first)
    - ongoing: ordered by start_time ASC (earliest started first)
    - past: ordered by start_time DESC (most recent first)
    """
    patient_id: int = Field(..., description="Patient ID")

    upcoming: List[MedicalVisitEntry] = Field(
        default_factory=list,
        description="Upcoming scheduled visits, sorted by start_time ASC"
    )
    ongoing: List[MedicalVisitEntry] = Field(
        default_factory=list,
        description="Ongoing visits, sorted by start_time ASC"
    )
    past: List[MedicalVisitEntry] = Field(
        default_factory=list,
        description="Past visits, sorted by start_time DESC"
    )

    counts: MedicalVisitCounts = Field(..., description="Explicit counts by status")

    model_config = ConfigDict(extra='forbid')


class MedicalVisitRecord(BaseModel):
    """Single visit record from database (mirrors medical_visits_view).

    INTERNAL USE ONLY - for service/repository layer.
    Agents and APIs should use VisitEntry instead.

    This model preserves the raw database structure with times that are
    projected into semantic status for external consumption.
    """
    id: int
    patient_id: int

    doctor_id: int
    doctor_name: str

    hc_provider_id: Optional[int] = None
    healthcare_provider_name: Optional[str] = None

    start_time: datetime
    end_time: Optional[datetime] = None

    visit_type: Optional[str] = None
    visit_details: Optional[str] = None

    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, extra='forbid')


class MedicalVisitsInput(BaseModel):
    """Model for creating a new visit.

    INTERNAL USE ONLY - for write operations and validation.
    Only enforces what the database requires.
    """
    start_time: datetime = Field(..., description="Visit start time (required)")

    # Optional fields
    end_time: Optional[datetime] = Field(None, description="Visit end time")
    visit_type: Optional[str] = Field(None, description="Type of visit")
    visit_details: Optional[str] = Field(None, description="Visit details")
    hc_provider_id: Optional[int] = Field(None, description="Healthcare provider ID")

    model_config = ConfigDict(extra='forbid')


class MedicalVisitsSupersedRecord(BaseModel):
    """Model for updating a visit.

    INTERNAL USE ONLY - for write operations.
    """
    original_id: int = Field(..., description="ID of the record to supersede")
    start_time: Optional[datetime] = Field(None, description="Updated start time")
    end_time: Optional[datetime] = Field(None, description="Updated end time")
    visit_type: Optional[str] = Field(None, description="Updated visit type")
    visit_details: Optional[str] = Field(None, description="Updated visit details")

    model_config = ConfigDict(extra='forbid')


# ============================================================================
# PROJECTION LAYER - Converts persistence records into semantic read models
# External APIs and agents should NEVER bypass this layer
# ============================================================================

def project_visit_status(
    record: MedicalVisitRecord,
    reference_datetime: Optional[datetime] = None
) -> VisitStatus:
    """Project database time into a single semantic status.

    CRITICAL RULE (DO NOT MODIFY):
    Status is time-based and deterministic. No DB status field.
    Uses datetime comparison with proper handling of ongoing visits.

    Business logic for status derivation (in precedence order):
    1. If end_time exists and < now → "past"
    2. If start_time <= now and (no end_time OR end_time >= now) → "ongoing"
    3. Otherwise → "upcoming"

    Edge cases handled:
    - Same-day visits use time comparison
    - Missing end_time defaults to ongoing if started
    - Deterministic and testable

    Args:
        record: Internal database record with start_time and end_time
        reference_datetime: Datetime to compare against (defaults to now)

    Returns:
        Semantic status: "upcoming", "ongoing", or "past"
    """
    if reference_datetime is None:
        reference_datetime = datetime.now(UTC)

    # Rule 1: Visit has ended
    if record.end_time and record.end_time < reference_datetime:
        return "past"

    # Rule 2: Visit is ongoing (started but not ended)
    if record.start_time <= reference_datetime and (
        record.end_time is None or record.end_time >= reference_datetime
    ):
        return "ongoing"

    # Rule 3: Visit hasn't started yet
    return "upcoming"


def build_visit_entry(
    record: MedicalVisitRecord,
    status: VisitStatus
) -> MedicalVisitEntry:
    """Build external VisitEntry from internal record with proper projections.

    CRITICAL RULES:
    1. All fields are preserved
    2. Status is pre-computed
    3. No visibility rules (visits are simple)

    Args:
        record: Internal database record
        status: Pre-computed status from project_visit_status()

    Returns:
        VisitEntry ready for external consumption
    """
    return MedicalVisitEntry(
        id=record.id,
        start_time=record.start_time,
        end_time=record.end_time,
        status=status,
        visit_type=record.visit_type,
        visit_details=record.visit_details,
        doctor_name=record.doctor_name,
        healthcare_provider_name=record.healthcare_provider_name,
        source="system"  # Default for now
    )


def group_visits_by_status(entries: List[MedicalVisitEntry]) -> dict:
    """Group visit entries by their status.

    Args:
        entries: List of VisitEntry objects

    Returns:
        Dictionary mapping status to lists of entries
    """
    grouped = {
        "upcoming": [],
        "ongoing": [],
        "past": []
    }

    for entry in entries:
        if entry.status in grouped:
            grouped[entry.status].append(entry)

    return grouped


def calculate_visit_counts(entries: List[MedicalVisitEntry]) -> MedicalVisitCounts:
    """Calculate explicit counts by status.

    Args:
        entries: List of VisitEntry objects

    Returns:
        VisitCounts with all counts explicitly calculated
    """
    upcoming_count = sum(1 for e in entries if e.status == "upcoming")
    ongoing_count = sum(1 for e in entries if e.status == "ongoing")
    past_count = sum(1 for e in entries if e.status == "past")

    return MedicalVisitCounts(
        upcoming=upcoming_count,
        ongoing=ongoing_count,
        past=past_count,
        total=len(entries)
    )


def sort_upcoming_visits(entries: List[MedicalVisitEntry]) -> List[MedicalVisitEntry]:
    """Sort upcoming visits by start_time ASC (soonest first).

    Args:
        entries: List of upcoming VisitEntry objects

    Returns:
        Sorted list (soonest first)
    """
    return sorted(entries, key=lambda e: e.start_time)


def sort_ongoing_visits(entries: List[MedicalVisitEntry]) -> List[MedicalVisitEntry]:
    """Sort ongoing visits by start_time ASC (earliest started first).

    Args:
        entries: List of ongoing VisitEntry objects

    Returns:
        Sorted list (earliest started first)
    """
    return sorted(entries, key=lambda e: e.start_time)


def sort_past_visits(entries: List[MedicalVisitEntry]) -> List[MedicalVisitEntry]:
    """Sort past visits by start_time DESC (most recent first).

    Args:
        entries: List of past VisitEntry objects

    Returns:
        Sorted list (most recent first)
    """
    return sorted(entries, key=lambda e: e.start_time, reverse=True)


# ============================================================================
# LEGACY COMPATIBILITY MODELS (for backward compatibility with agent code)
# ============================================================================

class MedicalVisit(BaseModel):
    """Legacy model for medical visits/appointments.

    Used by legacy agent code for creating and managing appointments.
    Maps to MedicalVisitsInput for new code.
    """
    doctor_id: int = Field(..., description="Doctor ID")
    patient_id: int = Field(..., description="Patient ID")
    start_time: datetime = Field(..., description="Appointment start time")
    end_time: datetime = Field(..., description="Appointment end time")
    visit_type: str = Field(..., description="Visit type (e.g., 'consultation', 'follow-up')")
    visit_details: Optional[str] = Field(None, description="Visit details/reason")

    model_config = ConfigDict(extra='forbid')


