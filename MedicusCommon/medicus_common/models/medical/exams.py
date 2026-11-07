"""Medical Exams and Exam Orders models for MedicusCommon.

This module provides Pydantic models for medical examinations using a semantic,
status-based approach that matches the UI contract and agent reasoning patterns.

DATABASE ARCHITECTURE - CQRS SPLIT:
This module unifies TWO SEPARATE persistence concepts at the database level:
1. medical_exam_orders: Future-oriented, represents intent
   - DB enforces scheduled_date > now() via triggers
   - No results or summary fields
   - Can be cancelled

2. medical_examinations: Past-oriented, represents facts
   - DB enforces exam_date <= now() via triggers
   - Always has results and summary
   - Immutable once created

SEMANTIC PROJECTION:
ExamEntry is a READ PROJECTION that unifies both sources into a single contract:
- pending: Active exam orders (source = "order", not cancelled)
- completed: Completed examinations (source = "exam")
- cancelled: Cancelled exam orders (source = "order", cancelled = true)

Status is SOURCE-DEPENDENT, not inferred from dates or a single status field.

Note: This is separate from timeline events. Timeline shows exams as generic events,
while this module provides exam-specific semantic contracts.
"""

from typing import Optional, List, Literal, Dict, Any
from datetime import date, time, datetime
from pydantic import BaseModel, Field, ConfigDict


# Type alias for exam status
ExamStatus = Literal["pending", "completed", "cancelled"]


class MedicalExamEntry(BaseModel):
    """Semantic exam entry for agent/API consumption.

    This model represents a medical examination (order or completed) with explicit
    lifecycle status. It maps to UI sections and agent reasoning patterns.

    This is the clinical view of an exam, distinct from its timeline event representation.
    """
    id: int = Field(..., description="Exam record ID")
    event_id: Optional[int] = Field(None, description="Link to timeline event (medical_events_view)")

    # Exam identification
    exam_type: str = Field(..., description="Type of examination (e.g., 'Blood Test', 'MRI', 'X-Ray')")
    category: Optional[str] = Field(None, description="Exam category (e.g., 'Laboratory', 'Imaging', 'Diagnostic')")

    # Scheduling
    ordered_date: date = Field(..., description="Date exam was ordered")
    scheduled_date: Optional[date] = Field(None, description="Date exam is/was scheduled")
    scheduled_time: Optional[time] = Field(None, description="Time exam is/was scheduled")
    completed_date: Optional[date] = Field(None, description="Date exam was completed")

    # Status
    status: ExamStatus = Field(..., description="Derived exam status (pending, completed, cancelled)")

    # Clinical context
    indication: Optional[str] = Field(None, description="Clinical indication/reason for exam")
    notes: Optional[str] = Field(None, description="Clinical notes")
    results: Optional[Dict[str, Any]] = Field(
        None,
        description="Exam results (only visible for completed exams)"
    )
    summary: Optional[str] = Field(None, description="Results summary (for completed exams)")

    # Provenance
    ordered_by: Optional[str] = Field(None, description="Doctor who ordered the exam")
    performed_by: Optional[str] = Field(None, description="Doctor/technician who performed the exam")
    healthcare_provider_name: Optional[str] = Field(None, description="Healthcare provider/facility")

    # Location (structured)
    location: Optional[Dict[str, Any]] = Field(None, description="Structured location data")
    formatted_location: Optional[str] = Field(None, description="Human-readable location string")
    latitude: Optional[float] = Field(None, description="Location latitude")
    longitude: Optional[float] = Field(None, description="Location longitude")

    source: Optional[Literal["clinician", "imported", "system"]] = Field(
        None,
        description="Source of the exam record"
    )

    model_config = ConfigDict(extra='forbid')


class ExamCounts(BaseModel):
    """Counts of exams by status.

    Explicitly defines what is counted to eliminate agent inference.
    """
    pending: int = Field(..., description="Count of pending exam orders")
    completed: int = Field(..., description="Count of completed exams")
    cancelled: int = Field(0, description="Count of cancelled exam orders")
    total: int = Field(..., description="Total count across all exams")

    model_config = ConfigDict(extra='forbid')


class ExamsResponse(BaseModel):
    """Response model for exams grouped by status.

    This is the primary external contract for agents, APIs, and UI.
    Exams are grouped by their semantic status to match UI sections
    and eliminate agent inference logic.

    Sorting rules:
    - pending: ordered by scheduled_date ASC (soonest first), then ordered_date DESC
    - completed: ordered by completed_date DESC (most recent first)
    - cancelled: ordered by ordered_date DESC (most recent first)
    """
    patient_id: int = Field(..., description="Patient ID")

    pending: List[MedicalExamEntry] = Field(
        default_factory=list,
        description="Pending exam orders, sorted by scheduled_date ASC"
    )
    completed: List[MedicalExamEntry] = Field(
        default_factory=list,
        description="Completed exams, sorted by completed_date DESC"
    )
    cancelled: List[MedicalExamEntry] = Field(
        default_factory=list,
        description="Cancelled exam orders, sorted by ordered_date DESC"
    )

    counts: ExamCounts = Field(..., description="Explicit counts by status")

    model_config = ConfigDict(extra='forbid')


class ExaminationsSimpleResponse(BaseModel):
    """Simple response model for get_medical_examinations tool.

    Returns pending and completed exams with total count,
    without the full grouping structure.
    """
    pending: List[Dict[str, Any]] = Field(default_factory=list, description="Pending exam orders")
    completed: List[Dict[str, Any]] = Field(default_factory=list, description="Completed exams")
    total_count: int = Field(0, description="Total number of exams")

    model_config = ConfigDict(extra='forbid')


class MedicalExamResultResponse(BaseModel):
    """Response model for exam mutation tools (order, report)."""
    exam_id: Optional[int] = Field(None, description="Exam ID")
    status: Optional[str] = Field(None, description="Operation status")
    formatted_text: Optional[str] = Field(None, description="Formatted exam report")

    model_config = ConfigDict(extra='forbid')


class MedicalExamRecord(BaseModel):
    """Single exam record from database (unified exam + exam_order).

    INTERNAL USE ONLY - for service/repository layer.
    Agents and APIs should use ExamEntry instead.

    This model represents a READ PROJECTION from two separate database sources:
    - medical_exam_orders (source="order"): Future exam orders
    - medical_examinations (source="exam"): Past completed exams

    Status is SOURCE-DEPENDENT, not a single field.
    """
    id: int
    patient_id: int
    exam_type_id: Optional[int] = None
    doctor_id: Optional[int] = None
    event_id: Optional[int] = None

    exam_type: str
    category: Optional[str] = None

    ordered_date: date
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    completed_date: Optional[date] = None

    # Source determines semantic status
    record_source: Literal["order", "exam"] = Field(
        ...,
        description="Database source: 'order' (medical_exam_orders) or 'exam' (medical_examinations)"
    )

    # Only meaningful for orders
    is_cancelled: Optional[bool] = Field(None, description="Whether exam order is cancelled (orders only)")

    indication: Optional[str] = None
    notes: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None

    ordered_by: Optional[str] = None
    performed_by: Optional[str] = None
    healthcare_provider_name: Optional[str] = None

    location: Optional[Dict[str, Any]] = None
    formatted_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: Optional[str] = None

    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra='forbid')


class MedicalExamOrderInput(BaseModel):
    """Model for creating a new exam order.

    INTERNAL USE ONLY - for write operations and validation.
    Only enforces what the database requires.
    """
    exam_type_id: int = Field(..., description="Exam type ID (required)")
    ordered_date: date = Field(..., description="Date ordered (required)")

    # Optional fields
    scheduled_date: Optional[date] = Field(None, description="Scheduled date")
    scheduled_time: Optional[time] = Field(None, description="Scheduled time")
    indication: Optional[str] = Field(None, description="Clinical indication")
    notes: Optional[str] = Field(None, description="Clinical notes")
    location: Optional[str] = Field(None, description="Structured location data as JSON string")

    model_config = ConfigDict(extra='forbid')


class MedicalExamInput(BaseModel):
    """Model for recording a completed exam (creates entry in medical_examinations).

    INTERNAL USE ONLY - for write operations.

    NOTE: In CQRS architecture, this creates a NEW record in medical_examinations,
    it does NOT update the exam order. The order remains in medical_exam_orders
    as historical intent. The two tables are linked conceptually but not mutated.
    """
    exam_order_id: int = Field(..., description="Reference to the original exam order ID")
    completed_date: date = Field(..., description="Date exam was completed")
    results: Dict[str, Any] = Field(..., description="Exam results")
    summary: Optional[str] = Field(None, description="Results summary")
    performed_by: Optional[str] = Field(None, description="Doctor/technician who performed exam")

    model_config = ConfigDict(extra='forbid')


class MedicalExamOrderSupersedeRecord(BaseModel):
    """Model for updating an exam order (medical_exam_orders only).

    INTERNAL USE ONLY - for write operations.

    NOTE: This ONLY applies to exam orders (future intent).
    Completed exams (medical_examinations) are IMMUTABLE and cannot be updated.
    Use ExamComplete to create a new completed exam record.
    """
    id: int = Field(..., description="Exam order ID to update")
    scheduled_date: Optional[date] = Field(None, description="Updated scheduled date")
    scheduled_time: Optional[time] = Field(None, description="Updated scheduled time")
    is_cancelled: Optional[bool] = Field(None, description="Mark as cancelled")
    notes: Optional[str] = Field(None, description="Updated notes")

    model_config = ConfigDict(extra='forbid')




# ============================================================================
# Helper functions for status projection and grouping
# ============================================================================

def project_exam_status(record: MedicalExamRecord) -> ExamStatus:
    """Project database source into a single semantic status.

    CRITICAL RULE (DO NOT MODIFY):
    Status is SOURCE-DEPENDENT, not inferred from dates or a single status field.
    This reflects the CQRS split at the database level.

    Business logic for status derivation (in precedence order):
    1. If record_source == "exam" → "completed" (medical_examinations table)
    2. If record_source == "order" and is_cancelled == True → "cancelled" (cancelled order)
    3. If record_source == "order" and is_cancelled == False → "pending" (active order)

    Database guarantees:
    - medical_exam_orders enforces scheduled_date > now() (DB trigger)
    - medical_examinations enforces exam_date <= now() (DB trigger)
    - medical_examinations always has results and summary
    - medical_exam_orders never has results or summary

    Edge cases handled:
    - Source determines status, no temporal ambiguity
    - DB triggers prevent cross-temporal pollution
    - Cancelled orders are always "past" in UI

    Args:
        record: Internal database record with source field

    Returns:
        Semantic status: "pending", "completed", or "cancelled"

    Raises:
        ValueError: If record_source is invalid or missing
    """
    # Rule 1: Completed exams (from medical_examinations)
    if record.record_source == "exam":
        return "completed"

    # Rule 2 & 3: Exam orders (from medical_exam_orders)
    if record.record_source == "order":
        if record.is_cancelled:
            return "cancelled"
        return "pending"

    # Defensive: This should never happen if DB is properly configured
    raise ValueError(f"Invalid record_source: {record.record_source}")


def build_exam_entry(record: MedicalExamRecord) -> MedicalExamEntry:
    """Build external ExamEntry from internal record with proper projections.

    CRITICAL RULES:
    1. Results are only visible for completed exams
    2. Summary is only visible for completed exams
    3. All other fields are preserved
    4. Structured location is maintained

    Args:
        record: Internal database record

    Returns:
        ExamEntry ready for external consumption
    """
    status = project_exam_status(record)

    # Rule: Results and summary only for completed exams
    results = record.results if status == "completed" else None
    summary = record.summary if status == "completed" else None

    return MedicalExamEntry(
        id=record.id,
        event_id=record.event_id,
        exam_type=record.exam_type,
        category=record.category,
        ordered_date=record.ordered_date,
        scheduled_date=record.scheduled_date,
        scheduled_time=record.scheduled_time,
        completed_date=record.completed_date,
        status=status,
        indication=record.indication,
        notes=record.notes,
        results=results,  # Enforced visibility rule
        summary=summary,  # Enforced visibility rule
        ordered_by=record.ordered_by,
        performed_by=record.performed_by,
        healthcare_provider_name=record.healthcare_provider_name,
        location=record.location,
        formatted_location=record.formatted_location,
        latitude=record.latitude,
        longitude=record.longitude,
        source=record.source
    )


def group_exams_by_status(entries: List[MedicalExamEntry]) -> dict:
    """Group exam entries by their status.

    Args:
        entries: List of ExamEntry objects

    Returns:
        Dictionary mapping status to lists of entries
    """
    grouped = {
        "pending": [],
        "completed": [],
        "cancelled": []
    }

    for entry in entries:
        if entry.status in grouped:
            grouped[entry.status].append(entry)

    return grouped


def calculate_exam_counts(entries: List[MedicalExamEntry]) -> ExamCounts:
    """Calculate explicit counts by status.

    Args:
        entries: List of ExamEntry objects

    Returns:
        ExamCounts with all counts explicitly calculated
    """
    pending_count = sum(1 for e in entries if e.status == "pending")
    completed_count = sum(1 for e in entries if e.status == "completed")
    cancelled_count = sum(1 for e in entries if e.status == "cancelled")

    return ExamCounts(
        pending=pending_count,
        completed=completed_count,
        cancelled=cancelled_count,
        total=len(entries)
    )


def sort_pending_exams(entries: List[MedicalExamEntry]) -> List[MedicalExamEntry]:
    """Sort pending exams by scheduled_date ASC, then ordered_date DESC.

    Sorting logic:
    - Primary: scheduled_date ASC (soonest first)
    - Secondary: ordered_date DESC (most recent orders first if no schedule)

    Args:
        entries: List of pending ExamEntry objects

    Returns:
        Sorted list
    """
    return sorted(
        entries,
        key=lambda e: (
            e.scheduled_date or date.max,  # Unscheduled orders go last
            e.scheduled_time or time.min,
            -e.ordered_date.toordinal()    # Recent orders first for unscheduled
        )
    )


def sort_completed_exams(entries: List[MedicalExamEntry]) -> List[MedicalExamEntry]:
    """Sort completed exams by completed_date DESC (most recent first).

    Args:
        entries: List of completed ExamEntry objects

    Returns:
        Sorted list (most recent first)
    """
    return sorted(
        entries,
        key=lambda e: e.completed_date or date.min,
        reverse=True
    )


def sort_cancelled_exams(entries: List[MedicalExamEntry]) -> List[MedicalExamEntry]:
    """Sort cancelled exams by ordered_date DESC (most recent first).

    Args:
        entries: List of cancelled ExamEntry objects

    Returns:
        Sorted list (most recent first)
    """
    return sorted(
        entries,
        key=lambda e: e.ordered_date,
        reverse=True
    )


# ============================================================================
# LEGACY COMPATIBILITY MODELS (for backward compatibility with agent code)
# ============================================================================

class ExamResult(BaseModel):
    """Legacy model for individual exam test results.

    Used by legacy agent code for formatting exam reports.
    """
    parameter: Optional[str] = Field(None, description="Test parameter name")
    test: Optional[str] = Field(None, description="Test name (alias for parameter)")
    value: str = Field(..., description="Test result value")
    units: Optional[str] = Field(None, description="Measurement units")
    reference_range: Optional[str] = Field(None, description="Normal reference range")
    comments: Optional[str] = Field(None, description="Additional comments")

    model_config = ConfigDict(extra='forbid')


class MedicalExam(BaseModel):
    """Legacy model for complete exam record.

    Used by legacy agent code for generating exam reports.
    Maps to MedicalExamEntry for new code.
    """
    patient_id: int = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    doctor_id: Optional[int] = Field(None, description="Doctor ID")
    doctor_name: Optional[str] = Field(None, description="Doctor name")
    exam_date: date = Field(..., description="Exam date")
    ordered_exam: str = Field(..., description="Ordered exam name")
    exam_type: str = Field(..., description="Exam type")
    healthcare_provider_name: Optional[str] = Field(None, description="Healthcare provider name")
    exam_results: Optional[List[ExamResult]] = Field(None, description="List of test results")
    exam_summary: Optional[str] = Field(None, description="Exam summary")

    model_config = ConfigDict(extra='forbid')


class MedicalExamOrder(BaseModel):
    """Legacy model for exam orders.

    Used by legacy agent code for creating exam orders.
    Maps to MedicalExamOrderInput for new code.
    """
    patient_id: int = Field(..., description="Patient ID")
    doctor_id: int = Field(..., description="Doctor ID")
    ordered_exam: str = Field(..., description="Ordered exam name")
    exam_type: str = Field(..., description="Exam type")
    healthcare_provider_name: Optional[str] = Field(None, description="Healthcare provider name")

    model_config = ConfigDict(extra='forbid')


# Alias for exam type categorization (simple string type)
ExamType = str


