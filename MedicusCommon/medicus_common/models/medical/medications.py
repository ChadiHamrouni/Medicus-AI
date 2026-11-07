"""Medications models for MedicusCommon.

This module provides Pydantic models for medications using a semantic,
lifecycle-based approach that matches the UI contract and agent reasoning patterns.

Status categorization:
- current: Medications actively being taken (no end_date or end_date >= today)
- previous: Medications that have been discontinued (end_date < today)
"""

from typing import Optional, List, Literal
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict


# Type alias for medication status
MedicationStatus = Literal["current", "previous"]


class MedicationEntry(BaseModel):
    """Semantic medication entry for agent/API consumption.

    This model represents a medication with explicit lifecycle status
    instead of requiring date inference. It maps to UI cards and agent reasoning patterns.
    """
    id: int = Field(..., description="Medication record ID")

    # Medication identification
    medication_name: str = Field(..., description="Medication name (e.g., Melatonin)")
    strength: Optional[str] = Field(None, description="Strength/concentration (e.g., '1 mg/mL')")
    form: Optional[str] = Field(None, description="Form (e.g., 'Oral Drops', 'Tablet', 'Capsule')")

    # Dosing information
    dose: Optional[str] = Field(None, description="Single dose amount (e.g., '1 mL', '2 tablets')")
    frequency: Optional[str] = Field(None, description="Frequency (e.g., 'once daily', 'twice daily')")
    time_of_day: Optional[str] = Field(None, description="Time(s) to take (e.g., '08:00', '08:00, 20:00')")

    # Lifecycle
    start_date: Optional[date] = Field(None, description="Date medication was started")
    end_date: Optional[date] = Field(None, description="Date medication was stopped (if applicable)")
    status: MedicationStatus = Field(..., description="Derived medication status")

    # Progress tracking
    duration_days: Optional[int] = Field(None, description="Total treatment duration in days")
    days_taken: Optional[int] = Field(None, description="Days medication has been taken")
    days_left: Optional[int] = Field(None, description="Days remaining in treatment")

    # Clinical context
    purpose: Optional[str] = Field(None, description="Reason/condition for medication")
    instructions: Optional[str] = Field(None, description="Special instructions")

    # Provenance
    prescribed_by: Optional[str] = Field(None, description="Prescribing doctor name")
    prescribed_at: Optional[date] = Field(None, description="Prescription date")
    source: Optional[Literal["clinician", "imported", "patient", "system"]] = Field(
        None,
        description="Source of the medication record"
    )

    model_config = ConfigDict(extra='forbid')


class MedicationCounts(BaseModel):
    """Counts of medications by status."""
    current: int = Field(..., description="Count of current medications")
    previous: int = Field(..., description="Count of previous medications")
    total: int = Field(..., description="Total count across all statuses")

    model_config = ConfigDict(extra='forbid')


class MedicationsResponse(BaseModel):
    """Response model for medications grouped by status.

    This is the primary external contract for agents, APIs, and UI.
    Medications are grouped by their semantic status to match UI tabs
    and eliminate agent inference logic.

    All medications within each group are sorted by start_date DESC (most recent first).
    """
    patient_id: int = Field(..., description="Patient ID")

    current: List[MedicationEntry] = Field(
        default_factory=list,
        description="Current medications being taken, sorted by start_date DESC"
    )
    previous: List[MedicationEntry] = Field(
        default_factory=list,
        description="Previous/discontinued medications, sorted by start_date DESC"
    )

    counts: MedicationCounts = Field(..., description="Explicit counts by status")

    model_config = ConfigDict(extra='forbid')


# ============================================================================
# INTERNAL MODELS - For service/repository layer and write operations only
# Agents and APIs should use MedicationsResponse instead
# ============================================================================

class Medication(BaseModel):
    """Single medication details.

    INTERNAL USE ONLY - for prescription creation and validation.
    This represents a medication within a prescription document.
    """
    medication_name: str = Field(..., description="Name of the medication")
    dosage: str = Field(..., description="Dosage amount of the medication")
    frequency: Optional[str] = Field(None, description="How often the medication should be taken")
    duration: Optional[str] = Field(None, description="Length of time the medication should be taken")
    purpose: Optional[str] = Field(None, description="Reason or condition the medication is prescribed for")
    form: Optional[str] = Field(None, description="Form of medication (tablet, capsule, liquid, etc.)")

    model_config = ConfigDict(extra='forbid')


class MedicalPrescription(BaseModel):
    """Prescription document model.

    INTERNAL USE ONLY - for prescription creation and storage.
    Agents and APIs should use MedicationsResponse instead.

    This represents a prescription document that groups multiple medications
    prescribed at the same time by the same doctor.
    """
    patient_id: int = Field(..., description="Unique identifier for the patient")
    patient_name: str = Field(..., description="Patient full name")
    doctor_id: int = Field(..., description="Unique identifier for the doctor")
    doctor_name: str = Field(..., description="Doctor full name")
    date_prescribed: str = Field(..., description="Date when the prescription was made")
    medications: List[Medication] = Field(..., description="List of medications prescribed")
    notes: Optional[str] = Field(None, description="Additional notes regarding the prescription")

    model_config = ConfigDict(extra='forbid')


class MedicalPrescriptionRecord(BaseModel):
    """Prescription record from database.

    INTERNAL USE ONLY - for repository layer.
    This preserves the prescription-centric view from the database.
    """
    date_prescribed: str = Field(..., description="Date when the prescription was made")
    medications: List[Medication] = Field(..., description="List of medications prescribed")
    doctor_name: str = Field(..., description="Doctor's name who prescribed the medications")
    notes: Optional[str] = Field(None, description="Additional notes regarding the prescription")

    model_config = ConfigDict(from_attributes=True, extra='forbid')


class MedicationRecord(BaseModel):
    """Single medication record from database.

    INTERNAL USE ONLY - for service/repository layer.
    Agents and APIs should use MedicationEntry instead.

    This model preserves the raw database structure with dates that are
    projected into semantic status for external consumption.
    """
    id: int
    patient_id: int
    prescription_id: Optional[int] = None
    doctor_id: Optional[int] = None

    medication_name: str
    strength: Optional[str] = None
    form: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    time_of_day: Optional[str] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None

    purpose: Optional[str] = None
    instructions: Optional[str] = None

    prescribed_by: Optional[str] = None
    prescribed_at: Optional[date] = None
    source: Optional[str] = None

    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra='forbid')


# ============================================================================
# Helper functions for status projection and lifecycle calculation
# ============================================================================

def project_medication_status(record: MedicationRecord, reference_date: Optional[date] = None) -> MedicationStatus:
    """Project database dates into a single semantic status.

    CRITICAL RULE (DO NOT MODIFY):
    end_date determines status. If end_date exists and is in the past, medication is previous.
    This ensures temporal correctness and matches UI expectations.

    Business logic for status derivation (in precedence order):
    1. If end_date exists and < reference_date → "previous"
    2. Otherwise → "current"

    Args:
        record: Internal database record with lifecycle dates
        reference_date: Date to compare against (defaults to today)

    Returns:
        Semantic status: "current" or "previous"
    """
    if reference_date is None:
        reference_date = date.today()

    if record.end_date and record.end_date < reference_date:
        return "previous"

    return "current"


def calculate_medication_progress(
    start_date: Optional[date],
    end_date: Optional[date],
    duration_days: Optional[int],
    reference_date: Optional[date] = None
) -> tuple[Optional[int], Optional[int]]:
    """Calculate days_taken and days_left for a medication.

    Args:
        start_date: When medication was started
        end_date: When medication should end
        duration_days: Total treatment duration
        reference_date: Date to calculate from (defaults to today)

    Returns:
        Tuple of (days_taken, days_left)
    """
    if reference_date is None:
        reference_date = date.today()

    days_taken = None
    days_left = None

    if start_date:
        days_taken = (reference_date - start_date).days
        if days_taken < 0:
            days_taken = 0

    if duration_days is not None and days_taken is not None:
        days_left = duration_days - days_taken
        if days_left < 0:
            days_left = 0
    elif end_date and reference_date < end_date:
        days_left = (end_date - reference_date).days

    return days_taken, days_left


def group_medications_by_status(entries: List[MedicationEntry]) -> dict:
    """Group medication entries by their status.

    Args:
        entries: List of MedicationEntry objects

    Returns:
        Dictionary mapping status to lists of entries
    """
    grouped = {
        "current": [],
        "previous": []
    }

    for entry in entries:
        if entry.status in grouped:
            grouped[entry.status].append(entry)

    return grouped
