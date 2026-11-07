"""Medical Notes models for MedicusCommon.

This module provides Pydantic models for medical notes using SOAP structure
(Subjective, Objective, Assessment, Plan).

CRITICAL DESIGN PRINCIPLE:
Notes are immutable clinical annotations. Unlike other medical domains (visits,
procedures, exams, medications), notes do NOT have:
- Lifecycle states
- Status fields
- Semantic grouping
- Temporal projection

Notes are content, not state. They are ordered chronologically and exposed verbatim.

This is an intentional exception to the 7-step semantic projection pattern used
in other domains. Notes are already semantically structured internally (SOAP),
so no additional status projection is needed.
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# SOAP Structure Models (Medical Standard)
# ============================================================================

class Subjective(BaseModel):
    """Subjective component of SOAP note (patient's perspective)."""
    chief_complaint: str = Field(..., description="Patient's primary reason for the visit")
    hpi: Optional[str] = Field(None, description="History of present illness")
    ros: Optional[str] = Field(None, description="Review of symptoms")
    medical_history: Optional[str] = Field(None, description="Patient's past medical history")
    family_history: Optional[str] = Field(None, description="Patient's family history of illnesses")
    social_history: Optional[str] = Field(None, description="Patient's social history (e.g., smoking, occupation)")
    medications: Optional[List[str]] = Field(None, description="List of current medications")
    allergies: Optional[List[str]] = Field(None, description="List of known allergies")
    patient_quotes: Optional[List[str]] = Field(None, description="Direct quotes from the patient")

    model_config = ConfigDict(extra='forbid')


class Objective(BaseModel):
    """Objective component of SOAP note (clinical findings)."""
    vital_signs: Optional[str] = Field(None, description="Vital signs measurements")
    physical_exam: Optional[str] = Field(None, description="Physical examination findings")

    model_config = ConfigDict(extra='forbid')


class Assessment(BaseModel):
    """Assessment component of SOAP note (clinical interpretation)."""
    diagnosis: Optional[str] = Field(None, description="Medical diagnosis or assessment")
    differential_diagnosis: Optional[List[str]] = Field(None, description="List of possible diagnoses")
    progress: Optional[str] = Field(None, description="Patient's progress since last visit or overall progress")
    summary: Optional[str] = Field(None, description="Overall summary of the assessment")

    model_config = ConfigDict(extra='forbid')


class Plan(BaseModel):
    """Plan component of SOAP note (treatment and follow-up)."""
    treatment: Optional[str] = Field(None, description="Detailed treatment plan")
    medications: Optional[List[str]] = Field(None, description="Medications prescribed or adjusted")
    further_tests: Optional[List[str]] = Field(None, description="Further diagnostic tests or procedures")
    referrals: Optional[List[str]] = Field(None, description="Referrals to specialists or other healthcare providers")
    patient_education: Optional[List[str]] = Field(None, description="Patient education provided")
    follow_up: Optional[str] = Field(None, description="Follow-up instructions or appointments")
    goals: Optional[List[str]] = Field(None, description="Treatment goals")

    model_config = ConfigDict(extra='forbid')


class NoteDetail(BaseModel):
    """Complete note structure supporting both SOAP and legacy summary formats.

    Legacy notes (pre-SOAP): Only summary field populated
    SOAP notes (current): Full SOAP structure with subjective/objective/assessment/plan

    At least one of summary or subjective should be present for a valid note.
    """
    # Legacy format support
    summary: Optional[str] = Field(None, description="Legacy summary-only note format")

    # SOAP format (all optional to support legacy notes)
    subjective: Optional[Subjective] = Field(None, description="Subjective component (patient's perspective)")
    objective: Optional[Objective] = Field(None, description="Objective component (clinical findings)")
    assessment: Optional[Assessment] = Field(None, description="Assessment component (clinical interpretation)")
    plan: Optional[Plan] = Field(None, description="Plan component (treatment and follow-up)")

    model_config = ConfigDict(extra='forbid')


# ============================================================================
# EXTERNAL MODELS - For agent/API consumption
# ============================================================================

class MedicalNoteEntry(BaseModel):
    """Semantic note entry for agent/API consumption.

    This model represents a medical note with full SOAP structure.
    Notes are immutable annotations with no lifecycle or status.
    """
    id: int = Field(..., description="Note record ID")
    note_date: date = Field(..., description="Date the note was created")

    # Provenance
    doctor_id: int = Field(..., description="Doctor who created the note")
    doctor_name: str = Field(..., description="Doctor's full name")

    # Content
    note_details: NoteDetail = Field(..., description="SOAP-structured note content")

    model_config = ConfigDict(extra='forbid')


class MedicalNoteRecord(BaseModel):
    """Single medical note record from database.

    INTERNAL USE ONLY - for service/repository layer.
    Agents and APIs should use MedicalNoteEntry instead.

    This model preserves the raw database structure with note_details as JSONB dict.
    """
    id: int
    patient_id: int
    doctor_id: int
    doctor_name: str

    note_date: date
    note_details: Dict[str, Any]  # Raw JSONB from database

    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra='forbid')


class MedicalNoteSupersedeRecord(BaseModel):
    """Input model for supersede_medical_note function tool.
    Used for correcting existing medical notes.
    """
    original_id: int = Field(..., description="ID of the note record to supersede")
    patient_id: int = Field(..., description="Patient ID")
    doctor_id: int = Field(..., description="Doctor ID")
    note_date: date = Field(..., description="Corrected note date")
    note_details: NoteDetail = Field(..., description="Corrected SOAP-structured content")

    model_config = ConfigDict(extra='forbid')


class MedicalNotesResponse(BaseModel):
    """Response model for medical notes.

    This is the primary external contract for agents, APIs, and UI.
    Notes are ordered chronologically (note_date DESC) with no semantic grouping.

    Unlike other medical domains, notes have no status or lifecycle semantics.
    They are immutable clinical annotations that are simply listed chronologically.
    """
    patient_id: int = Field(..., description="Patient ID")
    notes: List[MedicalNoteEntry] = Field(
        default_factory=list,
        description="Medical notes ordered by note_date DESC (most recent first)"
    )
    total: int = Field(..., description="Total count of all notes (not limited by pagination)")
    limit: int = Field(..., description="Maximum results per page")
    offset: int = Field(..., description="Number of results skipped")
    has_more: bool = Field(..., description="Whether there are more notes beyond this page")

    model_config = ConfigDict(extra='forbid')


class MedicalNoteInput(BaseModel):
    """Simplified input model for report_medical_note function tool.
    Satisfies OpenAI Agents SDK strict schema (no additionalProperties).
    """
    note_date: date = Field(..., description="Date the note was recorded/written")
    note_details: NoteDetail = Field(..., description="SOAP-structured note content")

    model_config = ConfigDict(extra='forbid')


class MedicalNoteInvalidate(BaseModel):
    """Input model for invalidating a medical note (marking as entered-in-error).

    Used when a note was recorded incorrectly or for the wrong patient
    and needs to be removed from active clinical views.
    """
    id: int = Field(..., description="ID of the note to invalidate")
    reason: str = Field(..., description="Mandatory reason for invalidation")

    model_config = ConfigDict(extra='forbid')


# ============================================================================
# PROJECTION LAYER - Converts persistence records into semantic read models
# ============================================================================

def build_note_entry(record: MedicalNoteRecord) -> MedicalNoteEntry:
    """Build external MedicalNoteEntry from internal record.

    CRITICAL RULES:
    1. Parse note_details dict into NoteDetail structure
    2. Preserve all fields
    3. No status projection (notes have no lifecycle)
    4. No visibility rules (notes are always visible)
    5. Fail soft on malformed JSONB (historical data may be messy)

    Args:
        record: Internal database record with note_details as dict

    Returns:
        MedicalNoteEntry ready for external consumption

    Raises:
        ValueError: If note_details cannot be parsed into valid SOAP structure
    """
    # Parse raw JSONB dict into structured NoteDetail
    # Fail soft: if malformed, raise clear error (agent can handle gracefully)
    try:
        note_details = NoteDetail(**record.note_details)
    except Exception as e:
        raise ValueError(
            f"Failed to parse note_details for note_id={record.id}: {str(e)}"
        )

    return MedicalNoteEntry(
        id=record.id,
        note_date=record.note_date,
        doctor_id=record.doctor_id,
        doctor_name=record.doctor_name,
        note_details=note_details
    )


def sort_notes(entries: List[MedicalNoteEntry]) -> List[MedicalNoteEntry]:
    """Sort notes by note_date DESC (most recent first), with id as tie-breaker.

    Uses deterministic ordering to prevent UI flicker and pagination bugs
    when multiple notes share the same date.

    Args:
        entries: List of MedicalNoteEntry objects

    Returns:
        Sorted list (most recent first, higher id first for same date)
    """
    return sorted(entries, key=lambda e: (e.note_date, e.id), reverse=True)


