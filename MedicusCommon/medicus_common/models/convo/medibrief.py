from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class MediBrief(BaseModel):
    """Doctor-facing summary of patient messages."""
    model_config = ConfigDict(extra='forbid')

    summary: str = Field(..., description="Clinical brief of everything medically relevant the patient asked, reported or arranged (questions, symptoms, medication concerns, appointments booked), with action items for the doctor.")
    key_symptoms: Optional[List[str]] = None
    timeline: Optional[str] = None
    notes: Optional[str] = None
