from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class MediExplain(BaseModel):
    """Patient-facing simplified explanation of doctor instructions."""
    model_config = ConfigDict(extra='forbid')

    summary: str = Field(..., description="Simple, clear explanation of the doctor message.")
    next_steps: Optional[List[str]] = None
    notes: Optional[str] = None
