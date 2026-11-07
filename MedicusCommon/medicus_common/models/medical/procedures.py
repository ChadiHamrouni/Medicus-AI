"""Medical Procedures models for MedicusCommon.

This module provides Pydantic models for medical procedures using a semantic,
status-based approach that matches the UI contract and agent reasoning patterns.

ProcedureStatus values:
- scheduled: Procedure is scheduled for future execution
- active: Procedure is currently in progress
- completed: Procedure has been completed successfully
- cancelled: Procedure was cancelled before execution
- missed: Procedure was missed (patient no-show or other reason)

Note: This is separate from timeline events. Timeline shows procedures as generic events,
while this module provides procedure-specific semantic contracts.
"""
import hashlib
import json
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import date, time, datetime
from pydantic import BaseModel, Field, ConfigDict, AwareDatetime, field_validator

from medicus_common.models.common import Address

ProcedureStatus = Literal["scheduled", "active", "completed", "cancelled", "missed"]


class CriticalInsight(BaseModel):
    time: str
    source: str
    event: str
    severity: int

    model_config = ConfigDict(extra='forbid')


class ProcedureSummary(BaseModel):
    medical_narrative: str
    risk_assessment: str  # STABLE | GUARDED | CRITICAL
    critical_insights: List[CriticalInsight]
    generated_at: datetime

    model_config = ConfigDict(extra='forbid')


class ProcedureCodeMapping(BaseModel):
    """Single mapping result from procedure_text to procedure_id."""
    procedure_text: str = Field(..., description="Original procedure text from clinician")
    procedure_id: Optional[int] = Field(None, description="Mapped procedure ID, None if no match found")

    model_config = ConfigDict(extra='forbid')


class ProcedureCodeMappingResult(BaseModel):
    """Batch result of procedure text to code mappings."""
    mappings: List[ProcedureCodeMapping] = Field(..., description="List of procedure mappings")

    model_config = ConfigDict(extra='forbid')


class MedicalProcedureDetailEntry(BaseModel):
    """
    Represents a granular event recorded during the execution of a medical procedure.
    This model maps to the objects contained within the clinical_events_log JSONB array.
    """
    id: Optional[int] = Field(default=None, description="The unique database identifier for the specific detail entry.")
    timestamp: AwareDatetime = Field(..., alias="time", description="The exact ISO 8601 timestamp when this event occurred and was logged.")
    actor_id: Optional[int] = Field(default=None, description="The unique identifier of the doctor or staff member who recorded this event.")
    actor_name: Optional[str] = Field(default=None, description="The full name of the clinician who performed the action, or 'System/Other' if automated.")
    actor_role: str = Field(..., description="The clinical role of the actor at the time of the event (e.g., 'Lead Surgeon', 'Anesthesiologist').")
    entry_type: str = Field(..., description="The category of the event entry (e.g., 'vitals_check', 'medication_admin', 'incision_start').")
    content: str = Field(..., description="The raw narrative text or structured data observations recorded for this specific event.")
    severity: int = Field(..., description="The clinical severity level of the event. Typically 1 for routine and >1 for critical/emergency events.")

    model_config = ConfigDict(extra='forbid', populate_by_name=True)


class MedicalProcedureEntry(BaseModel):
    """
    Semantic procedure entry for agent/API consumption, updated to align with the
    expanded medical_procedures_view including the nested clinical events log.
    """
    id: int = Field(..., description="The unique identifier for the medical procedure record.")
    patient_id: int = Field(..., description="The unique identifier for the patient.")

    # Provenance
    doctor_id: Optional[int] = Field(None, description="Unique identifier of the physician.")
    doctor_name: Optional[str] = Field(None, description="The full formatted name of the lead doctor.")
    display_name: str = Field(..., description="Resolved procedure name: COALESCE(procedure.name, procedure_text)")
    hc_provider_id: Optional[int] = Field(None, description="Unique identifier of the healthcare provider facility.")
    healthcare_provider_name: Optional[str] = Field(None, description="The name of the hospital or clinic where the procedure takes place.")

    # Scheduling and Duration
    scheduled_date: date = Field(..., description="The date the procedure is/was scheduled.")
    scheduled_time: Optional[time] = Field(None, description="The scheduled time of day for the procedure.")
    location: Optional[Union[Dict[str, Any], str]] = Field(None, description="Structured JSON representation of the facility location/room details.")

    @field_validator('location', mode='before')
    @classmethod
    def parse_location_json(cls, v):
        """Parse location if it's a JSON string from the database."""
        if v is None:
            return v
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return v
        return v

    # Clinical Reference Data
    procedure_code: Optional[str] = Field(None, description="Standardized clinical code (e.g., CPT, HCPCS) for the procedure.")
    cpt_code: Optional[str] = Field(default=None, description="CPT code of the procedure")
    icd10_pcs_code: Optional[str] = Field(default=None, description="ICD 10 PCS code of the procedure")

    # Procedure execution
    summary: Optional[Union[Dict[str, Any], str]] = Field(None, description="High-level narrative and risk assessment generated after the procedure. Can be a structured dictionary or plain text string.")

    # Status and Timeline
    status: Optional[str] = Field(None, description="Computed status: scheduled, active, completed, cancelled, missed.")
    cancelled_at: Optional[datetime] = Field(None, description="Timestamp when procedure was cancelled.")
    completed_at: Optional[datetime] = Field(None, description="Timestamp when procedure was completed.")

    created_at: datetime = Field(..., description="Database timestamp for when the record was initially created.")
    updated_at: Optional[datetime] = Field(None, description="Database timestamp for the last modification of this record.")

    model_config = ConfigDict(extra='forbid')


class MedicalProceduresResponse(BaseModel):
    """Response model for procedures grouped by status.

    This is the primary external contract for agents, APIs, and UI.
    Procedures are grouped by their semantic status to match UI sections
    and eliminate agent inference logic.

    All procedures within each group are sorted by scheduled_date DESC (most recent first).
    """
    patient_id: int = Field(..., description="Patient ID")

    procedures_list: List[MedicalProcedureEntry] = Field(
        default_factory=list,
        description="procedures (completed or cancelled), sorted by scheduled_date DESC"
    )

    counts: int = Field(..., description="Explicit counts")
    limit: int = Field(..., description="Maximum results per page (applied before grouping)")
    offset: int = Field(..., description="Number of results skipped (applied before grouping)")

    model_config = ConfigDict(extra='forbid')


class MedicalProcedureInput(BaseModel):
    """Input model for schedule_medical_procedure function tool.

    Uses procedure_text for real-time entry (medical coding happens later).
    Satisfies OpenAI Agents SDK strict schema (no additionalProperties).
    """
    doctor_id: int = Field(..., description="lead doctor assigning the procedure")
    procedure_text: str = Field(
        ...,
        description="The procedure as described by the doctor in their own language (e.g., 'appendectomie', 'knee surgery'). Medical coding will map this to a standard procedure later."
    )
    scheduled_date: date = Field(..., description="Date when procedure is scheduled")
    scheduled_time: Optional[time] = Field(None, description="Time when procedure is scheduled")

    healthcare_provider_text: Optional[str] = Field(None, description="healthcare provider suggested by the lead doctor")
    location: Optional[Address] = Field(None, description="Procedure location with full address details")

    model_config = ConfigDict(extra='forbid')


class MedicalProcedureSupersedeRecord(BaseModel):
    """Input model for supersede_medical_procedure function tool.
    Used for correcting existing procedure records.
    """
    original_id: int = Field(..., description="ID of the procedure record to supersede")
    patient_id: int = Field(..., description="Patient ID")
    doctor_id: int = Field(..., description="Doctor ID")
    hc_provider_id: Optional[int] = Field(None, description="Healthcare provider ID")

    procedure_text: str = Field(..., description="Corrected procedure description")

    scheduled_date: date = Field(..., description="Corrected date")
    scheduled_time: Optional[time] = Field(None, description="Corrected time")

    location: Optional[Address] = Field(None, description="Corrected location")

    model_config = ConfigDict(extra='forbid')


class MedicalProcedureInvalidate(BaseModel):
    """Input model for invalidating a medical procedure (marking as entered-in-error).

    Used when a procedure was recorded incorrectly or for the wrong patient
    and needs to be removed from active clinical views.
    """
    id: int = Field(..., description="ID of the procedure to invalidate")
    reason: str = Field(..., description="Mandatory reason for invalidation")

    model_config = ConfigDict(extra='forbid')


class ProcedureMappingCache:
    """
    Deterministic cache to avoid repeated LLM calls for the same procedure_text.
    Backed by an in-memory dict (can later be replaced by Redis / DB table).
    """

    def __init__(self):
        self._cache: Dict[str, Optional[int]] = {}

    @staticmethod
    def _key(procedure_text: str) -> str:
        normalized = procedure_text.strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def get(self, procedure_text: str) -> Optional[int]:
        return self._cache.get(self._key(procedure_text))

    def set(self, procedure_text: str, procedure_id: Optional[int]) -> None:
        self._cache[self._key(procedure_text)] = procedure_id

    def get_batch(self, procedure_texts: List[str]) -> Dict[str, Optional[int]]:
        """Batch lookup. Returns {text: procedure_id} for cache hits only."""
        results = {}
        for text in procedure_texts:
            cached = self.get(text)
            if cached is not None:
                results[text] = cached
        return results

    def set_batch(self, mappings: Dict[str, Optional[int]]) -> None:
        """Batch set. Takes {text: procedure_id} dict."""
        for text, proc_id in mappings.items():
            self.set(text, proc_id)

# ============================================================================
# Helper functions
# ============================================================================

class ProcedureDetailEventEntry(BaseModel):
    """Single event within a procedure detail timeline for tool response."""
    id: int = Field(..., description="Detail entry ID")
    actor_role: Optional[str] = Field(None, description="Role of the actor (surgeon, nurse, etc.)")
    entry_type: Optional[str] = Field(None, description="Type of entry (observation, vitals, medication, complication)")
    severity_level: int = Field(0, description="Severity level (0: Normal, 1: Watch, 2+: Critical)")
    logged_at: Optional[str] = Field(None, description="When the event was logged")
    event_text: Optional[str] = Field(None, description="Clinical narrative")
    event_value: Optional[str] = Field(None, description="Value if applicable")
    event_unit: Optional[str] = Field(None, description="Unit if applicable")

    model_config = ConfigDict(extra='forbid')


class MedicalProcedureDetailsResponse(BaseModel):
    """Response model for get_medical_procedure_details tool."""
    procedure_id: int = Field(..., description="Procedure identifier")
    procedure_name: Optional[str] = Field(None, description="Name/description of the procedure")
    details: List[ProcedureDetailEventEntry] = Field(default_factory=list, description="List of detail entries")
    total_count: int = Field(0, description="Number of detail entries")
    has_complications: bool = Field(False, description="True if any entry has severity_level >= 2")

    model_config = ConfigDict(extra='forbid')


class MedicalProcedureResultResponse(BaseModel):
    """Response model for procedure mutation tools (schedule, report, finalize, cancel)."""
    status: str = Field(..., description="Operation status")
    message: Optional[str] = Field(None, description="Human-readable message")
    id: Optional[int] = Field(None, description="Record ID")
    procedure_text: Optional[str] = Field(None, description="Procedure description")
    healthcare_provider_text: Optional[str] = Field(None, description="Healthcare provider")
    detail_id: Optional[int] = Field(None, description="Detail entry ID")
    logged_at: Optional[str] = Field(None, description="Timestamp when logged")
    events_count: Optional[int] = Field(None, description="Number of events")
    final_status: Optional[str] = Field(None, description="Final procedure status")
    closed_at: Optional[str] = Field(None, description="Closure timestamp")
    superseded_id: Optional[int] = Field(None, description="ID of superseded record")
    cancelled: Optional[bool] = Field(None, description="Whether cancelled")
    reason: Optional[str] = Field(None, description="Reason for cancellation")

    model_config = ConfigDict(extra='forbid')


def calculate_procedure_counts(entries: List[MedicalProcedureEntry]) -> int:
    """Return total count of procedures."""
    return len(entries)


