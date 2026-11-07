
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class KPISummaryInput(BaseModel):
    doctor_id: int
    start_date: str | datetime = Field(..., description="YYYY-MM-DD")
    end_date:   str | datetime = Field(..., description="YYYY-MM-DD")


class KPISummaryOutput(BaseModel):
    consult_count: int
    avg_visit_minutes: float | None
    after_hours_notes: int