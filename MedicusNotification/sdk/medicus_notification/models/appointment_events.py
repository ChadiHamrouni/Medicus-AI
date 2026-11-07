from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class AppointmentEventType(str, Enum):
    SCHEDULED = "AppointmentScheduled"
    RESCHEDULED = "AppointmentRescheduled"
    CANCELLED = "AppointmentCancelled"


class AppointmentScheduledEvent(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    visit_type: Optional[str] = None
    visit_details: Optional[str] = None
    location: Optional[str] = None


class AppointmentRescheduledEvent(AppointmentScheduledEvent):
    old_start_time: Optional[datetime] = None


class AppointmentCancelledEvent(BaseModel):
    id: Optional[int] = None
    patient_id: int
    doctor_id: int
    start_time: datetime
    reason: Optional[str] = None
