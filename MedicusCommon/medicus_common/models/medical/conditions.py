"""Medical conditions models for MedicusCommon.

This module provides Pydantic models for medical conditions using a semantic,
status-based approach that matches the UI contract and agent reasoning patterns.

VIEW SCHEMA (medical_conditions_latest_view and medical_conditions_view):
- id, patient_id, doctor_id, doctor_name
- diagnosis_date, condition_id, condition_text, display_name
- icd10, category, severity, is_chronic
- resolved_date, is_active, clinical_notes, created_at, clinical_status

Views JOIN with conditions knowledge base for icd10, category, is_chronic.
Records are IMMUTABLE (no updates, no deletes).

Status categorization (clinical_status computed by view):
- active: Currently active non-chronic conditions
- chronic: Long-term chronic conditions (from knowledge base)
- resolved: Previously active conditions that have been resolved
"""

import hashlib
from typing import Optional, List, Literal, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict


# Type alias for condition status
ConditionStatus = Literal["active", "chronic", "resolved"]


class MedicalConditionEntry(BaseModel):
    """Semantic medical condition entry for agent/API consumption.

    This model maps 1:1 to the materialized view structures.

    VIEW SCHEMA (medical_conditions_latest_view and medical_conditions_view):
    - id, patient_id, doctor_id, doctor_name
    - diagnosis_date, condition_id, condition_text, display_name
    - icd10, category, severity, is_chronic
    - resolved_date, is_active, clinical_notes, created_at, clinical_status
    """
    id: int = Field(..., description="Condition record ID")
    patient_id: int = Field(..., description="Patient ID")
    doctor_id: Optional[int] = Field(None, description="Doctor ID who diagnosed")
    doctor_name: Optional[str] = Field(None, description="Doctor name who diagnosed")

    # Diagnosis metadata
    diagnosis_date: Optional[date] = Field(None, description="Date of diagnosis")
    created_at: Optional[datetime] = Field(None, description="When record was created")

    # Condition data fields
    condition_id: Optional[int] = Field(None, description="FK to conditions knowledge base (NULL if not yet coded)")
    condition_text: Optional[str] = Field(None, description="Raw clinician input")
    display_name: Optional[str] = Field(None, description="Resolved condition name from reference or fallback")

    # Clinical classification
    icd10: Optional[str] = Field(None, description="ICD-10 code from knowledge base")
    category: Optional[str] = Field(None, description="Medical category from knowledge base")
    severity: Optional[str] = Field(None, description="Severity (mild, moderate, severe)")
    is_chronic: bool = Field(False, description="Chronic status from knowledge base")

    # Status fields
    resolved_date: Optional[date] = Field(None, description="Date resolved (if applicable)")
    is_active: bool = Field(True, description="Whether condition is currently active")
    clinical_notes: Optional[str] = Field(None, description="Doctor's specific notes about this diagnosis")
    clinical_status: Optional[str] = Field(None, description="Computed status from view (resolved/chronic/active)")

    model_config = ConfigDict(extra='forbid')


class MedicalConditionRecord(BaseModel):
    """Internal record from medical_conditions_view for service layer.

    INTERNAL USE ONLY - for service/repository layer processing.
    Maps directly to view columns for data transformation.

    VIEW SCHEMA:
    - id, patient_id, doctor_id, doctor_name
    - diagnosis_date, condition_id, condition_text, display_name
    - icd10, category, severity, is_chronic
    - resolved_date, is_active, clinical_notes, created_at, clinical_status
    """
    id: int
    patient_id: int = Field(..., description="Patient ID")
    doctor_id: Optional[int] = Field(None, description="Doctor ID who diagnosed")
    doctor_name: Optional[str] = Field(None, description="Doctor name from view")
    diagnosis_date: Optional[date] = Field(None)
    condition_id: Optional[int] = Field(None, description="FK to conditions knowledge base")
    condition_text: Optional[str] = Field(None, description="Raw clinician input")
    display_name: Optional[str] = Field(None, description="Resolved condition name from view")
    icd10: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None)
    severity: Optional[str] = Field(None)
    is_chronic: bool = Field(False, description="From knowledge base")
    resolved_date: Optional[date] = Field(None)
    is_active: bool = Field(True)
    clinical_notes: Optional[str] = Field(None)
    created_at: Optional[datetime] = Field(None)
    clinical_status: Optional[str] = Field(None, description="Computed status from view")

    model_config = ConfigDict(from_attributes=True, extra='forbid')


class MedicalConditionsCounts(BaseModel):
    """Counts of conditions by status."""
    active: int = Field(..., description="Count of active conditions")
    chronic: int = Field(..., description="Count of chronic conditions")
    resolved: int = Field(..., description="Count of resolved conditions")
    total: int = Field(..., description="Total count across all statuses")

    model_config = ConfigDict(extra='forbid')


class MedicalConditionsResponse(BaseModel):
    """Response model for medical conditions grouped by status.

    This is the primary external contract for agents, APIs, and UI.
    Conditions are grouped by their semantic status to match UI tabs
    and eliminate agent inference logic.

    All conditions within each group are sorted by diagnosis_date DESC (most recent first).
    """
    patient_id: int = Field(..., description="Patient ID")

    active: List[MedicalConditionEntry] = Field(
        default_factory=list,
        description="Active non-chronic conditions, sorted by diagnosis_date DESC"
    )
    chronic: List[MedicalConditionEntry] = Field(
        default_factory=list,
        description="Chronic long-term conditions, sorted by diagnosis_date DESC"
    )
    resolved: List[MedicalConditionEntry] = Field(
        default_factory=list,
        description="Resolved conditions, sorted by diagnosis_date DESC"
    )

    counts: MedicalConditionsCounts = Field(..., description="Explicit counts by status")

    model_config = ConfigDict(extra='forbid')


class MedicalConditionInput(BaseModel):
    """Model for creating a new medical condition.

    NEW ARCHITECTURE:
    - condition_id: Links to conditions knowledge base (optional, for coded conditions)
    - condition_text: Raw clinician input (always required)
    - icd10, is_chronic, category: Removed (derived from knowledge base via condition_id)

    Records are IMMUTABLE - no updates allowed after creation.
    """
    condition_id: Optional[int] = Field(None, description="FK to conditions knowledge base (NULL if not yet coded)")
    condition_text: str = Field(..., min_length=1, description="Raw clinician input describing the condition")
    diagnosis_date: Optional[date] = Field(None)
    severity: Optional[str] = Field(None)
    notes: Optional[str] = Field(None, description="Clinical notes about this diagnosis")
    resolved_date: Optional[date] = Field(None)
    is_active: bool = Field(True)

    model_config = ConfigDict(extra='forbid')


class MedicalConditionFilter(BaseModel):
    """Filter parameters for medical conditions.

    INTERNAL USE ONLY - for service layer queries.
    """
    patient_id: int
    is_active: Optional[bool] = None
    is_chronic: Optional[bool] = None
    category: Optional[str] = None
    limit: int = Field(100, ge=1, le=500)
    offset: int = Field(0, ge=0)

    model_config = ConfigDict(extra='forbid')


# ============================================================================
# Helper functions for status projection
# ============================================================================

def project_condition_status(record: MedicalConditionRecord) -> ConditionStatus:
    """Project database boolean flags into a single semantic status.

    CRITICAL RULE (DO NOT MODIFY):
    resolved_date ALWAYS wins. This ensures temporal correctness and prevents
    conflicts between chronic flag and resolution state.

    Business logic for status derivation (in precedence order):
    1. resolved: has resolved_date set (HIGHEST PRIORITY)
    2. chronic: is_chronic flag is True
    3. active: default for active conditions

    Edge cases handled:
    - Chronic condition that was resolved → returns "resolved"
    - Chronic flag left true by mistake after resolution → returns "resolved"
    - Resolved condition without chronic flag → returns "resolved"

    Args:
        record: Internal database record with boolean flags

    Returns:
        Semantic status: "active", "chronic", or "resolved"
    """
    if record.resolved_date is not None:
        return "resolved"
    if record.is_chronic:
        return "chronic"
    return "active"


def build_condition_entry(
    record: MedicalConditionRecord,
    status: ConditionStatus,
    doctor_name: Optional[str] = None
) -> MedicalConditionEntry:
    """Build external MedicalConditionEntry from internal MedicalConditionRecord.

    Args:
        record: Internal record from medical_conditions_view
        status: clinical_status from view or computed via project_condition_status()
        doctor_name: Doctor name from view (optional override)

    Returns:
        MedicalConditionEntry ready for external consumption
    """
    return MedicalConditionEntry(
        id=record.id,
        patient_id=record.patient_id,
        doctor_id=record.doctor_id,
        doctor_name=doctor_name or record.doctor_name,
        diagnosis_date=record.diagnosis_date,
        created_at=record.created_at,
        condition_id=record.condition_id,
        condition_text=record.condition_text,
        display_name=record.display_name,
        icd10=record.icd10,
        category=record.category,
        severity=record.severity,
        is_chronic=record.is_chronic,
        resolved_date=record.resolved_date,
        is_active=record.is_active,
        clinical_notes=record.clinical_notes,
        clinical_status=status
    )


def group_conditions_by_status(entries: List[MedicalConditionEntry]) -> dict:
    """Group condition entries by their clinical_status.

    Args:
        entries: List of MedicalConditionEntry objects

    Returns:
        Dictionary mapping status to lists of entries
    """
    grouped = {
        "active": [],
        "chronic": [],
        "resolved": []
    }

    for entry in entries:
        status = entry.clinical_status or "active"
        if status in grouped:
            grouped[status].append(entry)
        else:
            grouped["active"].append(entry)

    return grouped


def calculate_condition_counts(entries: List[MedicalConditionEntry]) -> MedicalConditionsCounts:
    """Calculate explicit counts for each condition clinical_status.

    Args:
        entries: List of MedicalConditionEntry objects

    Returns:
        MedicalConditionsCounts with all counts explicitly calculated
    """
    active_count = sum(1 for e in entries if e.clinical_status == "active")
    chronic_count = sum(1 for e in entries if e.clinical_status == "chronic")
    resolved_count = sum(1 for e in entries if e.clinical_status == "resolved")

    return MedicalConditionsCounts(
        active=active_count,
        chronic=chronic_count,
        resolved=resolved_count,
        total=len(entries)
    )


# ============================================================================
# Clinical Coding Models (Batch Processing)
# ============================================================================

class ConditionCodeMapping(BaseModel):
    """Single mapping result from condition_text to condition_id."""
    condition_text: str = Field(..., description="Original condition text from clinician")
    condition_id: Optional[int] = Field(None, description="Mapped condition ID, None if no match found")

    model_config = ConfigDict(extra='forbid')


class ConditionCodeMappingResult(BaseModel):
    """Batch result of condition text to code mappings."""
    mappings: List[ConditionCodeMapping] = Field(..., description="List of condition mappings")

    model_config = ConfigDict(extra='forbid')


class ConditionMappingCache:
    """
    Deterministic cache to avoid repeated LLM calls for the same condition_text.
    Backed by an in-memory dict (can later be replaced by Redis / DB table).
    """

    def __init__(self):
        self._cache: Dict[str, Optional[int]] = {}

    @staticmethod
    def _key(condition_text: str) -> str:
        normalized = condition_text.strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def get(self, condition_text: str) -> Optional[int]:
        return self._cache.get(self._key(condition_text))

    def set(self, condition_text: str, condition_id: Optional[int]) -> None:
        self._cache[self._key(condition_text)] = condition_id

    def get_batch(self, condition_texts: List[str]) -> Dict[str, Optional[int]]:
        """Batch lookup. Returns {text: condition_id} for cache hits only."""
        results = {}
        for text in condition_texts:
            cached = self.get(text)
            if cached is not None:
                results[text] = cached
        return results

    def set_batch(self, mappings: Dict[str, Optional[int]]) -> None:
        """Batch set. Takes {text: condition_id} dict."""
        for text, cond_id in mappings.items():
            self.set(text, cond_id)


# ============================================================================
# Backward compatibility aliases (deprecated)
# ============================================================================

MedicalConditionBase = MedicalConditionRecord
MedicalConditionResponse = MedicalConditionRecord
MedicalConditionsListResponse = MedicalConditionsResponse