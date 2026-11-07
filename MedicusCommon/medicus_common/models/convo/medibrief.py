from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class MediBrief(BaseModel):
    """Doctor-facing summary of patient messages."""
    model_config = ConfigDict(extra='forbid')

    summary: str = Field(..., description="Concise medical summary of patient messages.")
    key_symptoms: Optional[List[str]] = None
    timeline: Optional[str] = None
    notes: Optional[str] = None
