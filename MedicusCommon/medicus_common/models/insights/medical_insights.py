from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class DifferentialModel(BaseModel):
    """
    Represents one differential diagnosis entry for clinical reasoning.
    """
    condition: str = Field(..., description="Name of the possible condition")
    likelihood: str = Field(..., description="Estimated likelihood: e.g., 'high', 'medium', or 'low'")
    rationale: str = Field(..., description="Brief clinical rationale for inclusion")

class SuggestedTestModel(BaseModel):
    """
    Models a diagnostic test suggestion with supporting reason.
    """
    test: str = Field(..., description="Name of the recommended diagnostic test")
    reason: str = Field(..., description="Reason why this test is recommended")

class InsightMetadata(BaseModel):
    """
    Shared metadata across both medipatient- and clinician-facing insights.
    """
    convo_id: str = Field(..., description="Unique identifier for the conversation context")
    message_ids: List[str] = Field(..., description="List of message IDs that the insights are based on")
    timestamp: datetime = Field(..., description="Timestamp when the insights were generated")

class MedicalInsight(BaseModel):
    """
    Unified insight model combining medipatient-centric and clinician-centric fields.
    Nested 'metadata' field consolidates shared properties for reuse.
    """
    metadata: InsightMetadata = Field(..., description="Context metadata for traceability")

    # MediAid (patient-facing) sections
    chief_concerns: str = Field(..., description="Summary of main patient concerns")
    medical_history: Optional[str] = Field(None, description="Relevant past medical history, if mentioned")
    red_flags: Optional[List[str]] = Field(None, description="List of potential red flags detected in conversation")

    # MediDoc (clinician-facing) sections
    soap_subjective: str = Field(..., description="Subjective findings from medipatient narrative")
    soap_objective: Optional[str] = Field(None, description="Objective data such as vitals or tests if available")
    soap_assessment: str = Field(..., description="Clinical assessment or impression")
    soap_plan: str = Field(..., description="Plan of action: tests, referrals, treatment recommendations")
    differential: Optional[List[DifferentialModel]] = Field(
        None, description="Ranked differential diagnoses with rationales")
    suggested_tests: Optional[List[SuggestedTestModel]] = Field(
        None, description="Tests suggested for further diagnostics, with reasoning")
    missed_symptoms: Optional[List[str]] = Field(
        None, description="Symptoms that were not discussed but should be probed during the visit")
