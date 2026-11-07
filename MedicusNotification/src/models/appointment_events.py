"""
Appointment domain event models.
All models are imported from medicus_notification (the SDK) — this file is a
pure re-export layer and intentionally contains no Pydantic definitions.
"""

from medicus_notification.models.appointment_events import (
    AppointmentEventType,
    AppointmentScheduledEvent,
    AppointmentRescheduledEvent,
    AppointmentCancelledEvent,
)

__all__ = [
    "AppointmentEventType",
    "AppointmentScheduledEvent",
    "AppointmentRescheduledEvent",
    "AppointmentCancelledEvent",
]
