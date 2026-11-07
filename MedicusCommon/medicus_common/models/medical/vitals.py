"""Medical Vitals models for patient health profile data from medical_vitals_view.

This module provides Pydantic models for patient medical vitals using a generic,
scalable approach that matches the JSONB-based database design.

The medical_vitals_view materialized view stores vitals as key-value pairs,
which are grouped by category for presentation.

Categories (defined in database):
- vitals: Clinical measurements (temperature, blood pressure, oxygen saturation, heart rate)
- lifestyle: Lifestyle information (diet, alcohol use, sleep, exercise, smoking)
- body_metrics: Physical measurements (BMI, waist, height, weight)
- immunization: Immunization records and vaccine status
- biological: Biological traits (blood type, RH factor, genetic traits)
- reproductive: Reproductive health information
- other: Unclassified medical data

NOTE: Categorization is now handled by the database via vital_reference_ranges table.
The CATEGORY_MAP has been deprecated in favor of database-driven categorization.
"""

import hashlib
from typing import Optional, Literal, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# NEW: Threshold Models (Data-Driven)
# ============================================================

class VitalThresholdZone(BaseModel):
    """Single threshold zone definition.

    Represents one zone in a vital's threshold configuration (e.g., "Normal", "High", "Critical").
    UI must render these zones exactly as provided - no interpretation.
    """
    min: Optional[float] = Field(None, description="Minimum value for this zone (None = open-ended low)")
    max: Optional[float] = Field(None, description="Maximum value for this zone (None = open-ended high)")
    color: str = Field(..., description="Hex color code for this zone (e.g., '#10B981')")
    label: str = Field(..., description="Display label for this zone (e.g., 'Normal', 'High', 'Critical')")
    status: Optional[str] = Field(None, description="Optional status key (e.g., 'NORMAL', 'EMERGENCY_HIGH')")

    model_config = ConfigDict(extra='forbid')


class VitalThresholdConfig(BaseModel):
    """Complete threshold configuration for a specific vital.

    Contains all zones and metadata for rendering threshold bars.
    This is fetched from vital_reference_ranges table based on patient gender and age.
    """
    gender: str = Field(..., description="Gender applicability: 'M', 'F', or 'ALL'")
    age_min: int = Field(..., description="Minimum age for this config")
    age_max: int = Field(..., description="Maximum age for this config")
    zones: List[VitalThresholdZone] = Field(..., description="Ordered list of threshold zones")

    model_config = ConfigDict(extra='forbid')


class VitalValue(BaseModel):
    vital_text: str = Field(..., description="the text entered as the vital name in the language of the clinician")
    vital_value: str = Field(..., description="the value reported of the vital")

class MedicalVitalEntry(BaseModel):
    """Generic medical entry representing a single vital/measurement.

    This model represents any medical data point as a category-name-value triple.
    It maps 1:1 to the materialized view structures.

    VIEW SCHEMA (medical_vitals_latest_view):
    - id, patient_id, doctor_name, healthcare_provider_name, recorded_at
    - vital_id, vital_category, display_name, vital_value
    - convo_id, message_id, tool, actor_role, actor_user_id

    VIEW SCHEMA (medical_vitals_view) - same + vital_text, unit

    All categorization, display names, units, and thresholds come from the database
    via the vital_reference_ranges table and materialized views.
    """
    id: int = Field(..., description="Vitals record ID from medical_vitals table")
    patient_id: int = Field(..., description="Patient ID")
    doctor_name: Optional[str] = Field(None, description="Doctor who recorded this vital")
    healthcare_provider_name: Optional[str] = Field(None, description="Healthcare provider where it was recorded")

    # Recording metadata
    recorded_at: datetime = Field(..., description="When this vital was recorded")

    # Vital data fields
    vital_id: Optional[int] = Field(None, description="FK to vital_reference_ranges (NULL if not yet coded)")
    vital_category: Optional[str] = Field(None, description="Category of the vital from reference")
    display_name: Optional[str] = Field(None, description="Resolved display name from reference or fallback")
    vital_value: Optional[str] = Field(None, description="The value of the vital")

    # Only in medical_vitals_view (not in latest view)
    vital_text: Optional[str] = Field(None, description="Raw clinician input in their language")
    unit: Optional[str] = Field(None, description="Unit of measurement from database")

    # Audit/context fields
    convo_id: Optional[int] = Field(None, description="Conversation ID where vital was recorded")
    message_id: Optional[int] = Field(None, description="Message ID where vital was recorded")
    tool: Optional[str] = Field(None, description="Tool used to record the vital")
    actor_role: Optional[str] = Field(None, description="Role of actor who recorded the vital")
    actor_user_id: Optional[int] = Field(None, description="User ID of actor who recorded the vital")

    model_config = ConfigDict(extra='forbid')


class MedicalVitalsCounts(BaseModel):
    """Counts of vitals by category."""
    vitals: int = Field(..., description="Count of vital signs")
    lifestyle: int = Field(..., description="Count of lifestyle entries")
    body_metrics: int = Field(..., description="Count of body metrics")
    vaccines: int = Field(..., description="Count of vaccine entries")
    immunization: int = Field(..., description="Count of immunization entries")
    biological: int = Field(..., description="Count of biological traits")
    reproductive: int = Field(..., description="Count of reproductive health entries")
    other: int = Field(..., description="Count of unclassified entries")
    total: int = Field(..., description="Total count across all categories")

    model_config = ConfigDict(extra='forbid')


class MedicalVitalsInput(BaseModel):
    """Input model for recording vitals in the clinician's language.

    Captures vital measurements exactly as spoken by the doctor.
    Medical coding maps these to standard vital_keys from vital_reference_ranges later.

    Pattern: Same as procedure_text -> procedure_code mapping.
    - Real-time: Store raw clinician input
    - Offline batch: Map to standardized vital_keys

    Example vital_values:
        {"tension artérielle": "135/85", "pouls": 72, "température": 37.2}
        {"blood pressure": "120/80", "heart rate": 68}
    """
    vital_values: List[VitalValue] = Field(
        ...,
        description="Vitals as described by the clinician in their language. Keys are vital names, values are measurements."
    )

    model_config = ConfigDict(extra='forbid')


class MedicalVitalsResponse(BaseModel):
    """Response model for medical vitals data grouped by category.

    Used by MedicusAI tools for enriched vitals responses.
    Groups medical entries by category for organized presentation.

    All vitals within each category are sorted by recorded_at DESC (most recent first).
    """
    patient_id: int = Field(..., description="Patient ID")
    vitals: List[MedicalVitalEntry] = Field(default_factory=list, description="Vital signs measurements, sorted by recorded_at DESC")
    lifestyle: List[MedicalVitalEntry] = Field(default_factory=list, description="Lifestyle information, sorted by recorded_at DESC")
    body_metrics: List[MedicalVitalEntry] = Field(default_factory=list, description="Body measurements, sorted by recorded_at DESC")
    vaccines: List[MedicalVitalEntry] = Field(default_factory=list, description="Vaccine records, sorted by recorded_at DESC")
    immunization: List[MedicalVitalEntry] = Field(default_factory=list, description="Immunization records, sorted by recorded_at DESC")
    biological: List[MedicalVitalEntry] = Field(default_factory=list, description="Biological traits, sorted by recorded_at DESC")
    reproductive: List[MedicalVitalEntry] = Field(default_factory=list, description="Reproductive health, sorted by recorded_at DESC")
    other: List[MedicalVitalEntry] = Field(default_factory=list, description="Unclassified medical data, sorted by recorded_at DESC")
    counts: MedicalVitalsCounts = Field(..., description="Explicit counts by category")

    model_config = ConfigDict(extra='forbid')


class MedicalVitalsSimpleResponse(BaseModel):
    """Simple response model for get_medical_vitals tool.

    Returns a flat list of vitals with count, without grouping by category.
    Used when only the latest vitals are needed.
    """
    patient_id: int = Field(..., description="Patient ID")
    vitals: List[MedicalVitalEntry] = Field(default_factory=list, description="List of vital entries")
    count: int = Field(0, description="Total number of vital entries")

    model_config = ConfigDict(extra='forbid')


class MedicalVitalsResultResponse(BaseModel):
    """Response model for report_medical_vitals tool."""
    status: str = Field(..., description="Operation status")
    message: Optional[str] = Field(None, description="Human-readable message")
    id: Optional[int] = Field(None, description="Record ID")
    recorded_at: Optional[str] = Field(None, description="Recording timestamp")
    vital_values: Optional[List[Dict[str, Any]]] = Field(None, description="Vital values recorded")

    model_config = ConfigDict(extra='forbid')


def group_entries_by_category(entries: List[MedicalVitalEntry]) -> Dict[str, List[MedicalVitalEntry]]:
    """Group medical entries by category.

    Args:
        entries: List of MedicalEntry objects

    Returns:
        Dictionary mapping category names to lists of entries
    """
    grouped = {
        "vitals": [],
        "lifestyle": [],
        "body_metrics": [],
        "vaccines": [],
        "immunization": [],
        "biological": [],
        "reproductive": [],
        "other": []
    }

    for entry in entries:
        if entry.vital_category in grouped:
            grouped[entry.vital_category].append(entry)

    return grouped


# ============================================================
# Coding Models (for offline batch mapping)
# ============================================================

class VitalKeyMapping(BaseModel):
    """Single mapping result from vital_text to vital_key."""
    vital_text: str = Field(..., description="Original vital text from clinician")
    vital_id: Optional[int] = Field(None, description="Mapped vital_id from vitals table, None if no match")
    vital_key: Optional[str] = Field(None, description="Mapped vital_key from vitals table, None if no match")

    model_config = ConfigDict(extra='forbid')


class VitalKeyMappingResult(BaseModel):
    """Batch result of vital text to key mappings."""
    mappings: List[VitalKeyMapping] = Field(..., description="List of vital mappings")

    model_config = ConfigDict(extra='forbid')


class VitalMappingCache:
    """
    Deterministic cache to avoid repeated LLM calls for the same vital_text.
    Backed by an in-memory dict (can later be replaced by Redis / DB table).
    """

    def __init__(self):
        self._cache: Dict[str, Optional[str]] = {}

    @staticmethod
    def _key(vital_text: str) -> str:
        normalized = vital_text.strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def get(self, vital_text: str) -> Optional[str]:
        return self._cache.get(self._key(vital_text))

    def set(self, vital_text: str, vital_key: Optional[str]) -> None:
        self._cache[self._key(vital_text)] = vital_key

    def get_batch(self, vital_texts: List[str]) -> Dict[str, Optional[str]]:
        """Batch lookup. Returns {text: vital_key} for cache hits only."""
        results = {}
        for text in vital_texts:
            cached = self.get(text)
            if cached is not None:
                results[text] = cached
        return results

    def set_batch(self, mappings: Dict[str, Optional[str]]) -> None:
        """Batch set. Takes {text: vital_key} dict."""
        for text, key in mappings.items():
            self.set(text, key)



