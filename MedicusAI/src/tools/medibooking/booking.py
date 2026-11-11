from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import asyncpg
from agents import function_tool

from medicus_common.core import logger
from medicus_common.core.database import db_manager
from medicus_common.models.medical.visits import MedicalVisit

from src.tools.medibooking.helpers import get_attr

try:
    from medicus_notification import NotificationClient
except ImportError:  # notifications are optional
    NotificationClient = None

VALID_VISIT_TYPES = frozenset({
    "consultation", "procedure", "exam", "prescription", "follow-up", "check-up", "emergency", "other",
})

VISIT_TYPE_MAPPING = {
    "prp session": "procedure", "prp": "procedure", "botox": "procedure", "filler": "procedure",
    "injection": "procedure", "treatment": "procedure", "therapy": "procedure", "surgery": "procedure",
    "followup": "follow-up", "follow up": "follow-up", "checkup": "check-up", "check up": "check-up",
    "routine": "check-up", "appointment": "consultation", "visit": "consultation", "general": "consultation",
}


def normalize_visit_type(visit_type: str) -> str:
    """Map free-text visit types from the model onto visit_type_enum values."""
    if not visit_type:
        return "consultation"
    normalized = visit_type.lower().strip()
    if normalized in VALID_VISIT_TYPES:
        return normalized
    if normalized in VISIT_TYPE_MAPPING:
        return VISIT_TYPE_MAPPING[normalized]
    for key, value in VISIT_TYPE_MAPPING.items():
        if key in normalized:
            return value
    return "consultation"


def _as_utc(value) -> datetime:
    """Accept ISO strings or datetimes; naive values are taken to be UTC."""
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if not isinstance(value, datetime):
        raise ValueError(f"Expected a datetime, got {type(value).__name__}")
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


async def _publish(event_type: str, payload: Dict[str, Any]) -> None:
    """Best-effort domain event to the notification service (patient + doctor are notified)."""
    client = NotificationClient.from_env() if NotificationClient else None
    if client is None:
        return
    try:
        await client.send_event(event_type, payload)
    except Exception as e:
        logger.warning(f"[BOOKING] Failed to publish {event_type}: {e}")


@function_tool
async def create_booking(medical_visit: MedicalVisit):
    """
    Create a new appointment booking using a previously selected time slot.

    INTENT
    ------
    Use this tool IMMEDIATELY AFTER the user selects a specific slot.

    STATE TRANSITION
    ----------------
    This tool FINALIZES an appointment.
    After successful execution, the booking exists and must be acknowledged.

    PARAMETERS
    ----------
    medical_visit : MedicalVisit
        Booking details.
        - start_time: the time the user chose, inside a free range returned by find_free_slots
          (one of the slot start times returned by find_free_slots)
        - end_time: optional; defaults to start_time + 30 minutes
        - visit_type: optional, e.g. "follow-up" (defaults to "consultation")

    HARD RULES
    ----------
    - MUST be called once the user confirms a slot
    - MUST NOT re-call find_free_slots after user selection
    - MUST NOT parse dates from natural language
    - MUST NOT create tentative or placeholder bookings
    - NEVER tell the user an appointment is booked or confirmed unless this tool returned
      "Appointment booked successfully"
    """
    start_time = _as_utc(get_attr(medical_visit, "start_time"))
    raw_end = get_attr(medical_visit, "end_time")
    end_time = _as_utc(raw_end) if raw_end else start_time + timedelta(minutes=30)
    visit_type = normalize_visit_type(get_attr(medical_visit, "visit_type") or "consultation")
    visit_details = get_attr(medical_visit, "visit_details")
    patient_id = get_attr(medical_visit, "patient_id")
    doctor_id = get_attr(medical_visit, "doctor_id")

    if end_time <= start_time:
        return "The appointment end time must be after its start time."
    if start_time < datetime.now(timezone.utc):
        return "Cannot book a time in the past. Ask the user to pick a future slot from find_free_slots."

    try:
        appointment_id = await db_manager.fetchval(
            """INSERT INTO public.medical_visits
               (doctor_id, patient_id, start_time, end_time, visit_type, visit_details, created_by)
               VALUES ($1, $2, $3, $4, $5::visit_type_enum, $6, 'assistant')
               RETURNING id""",
            doctor_id, patient_id, start_time, end_time, visit_type, visit_details,
        )
    except Exception as e:
        cause = e.__cause__ or e
        if isinstance(cause, (asyncpg.UniqueViolationError, asyncpg.ExclusionViolationError)):
            return "That time slot is no longer available. Offer the user other slots from find_free_slots."
        raise

    logger.info(f"[BOOKING] created visit {appointment_id}: patient={patient_id} doctor={doctor_id} at {start_time}")
    await _publish("AppointmentScheduled", {
        "id": appointment_id, "appointment_id": appointment_id,
        "patient_id": patient_id, "doctor_id": doctor_id,
        "start_time": start_time.isoformat(), "end_time": end_time.isoformat(),
        "visit_type": visit_type, "visit_details": visit_details,
    })
    return f"Appointment booked successfully for {start_time.strftime('%B %d, %Y at %I:%M %p')} (UTC)"


@function_tool
async def update_booking(medical_visit: MedicalVisit):
    """
    Update metadata of an EXISTING appointment without changing time.

    INTENT
    ------
    Use this tool when the user adds or corrects details
    but does NOT want to reschedule.

    HARD RULES
    ----------
    - MUST NOT change start_time or end_time
    - MUST NOT be used for rescheduling
    - For rescheduling: delete_booking → create_booking
    """
    doctor_id = get_attr(medical_visit, "doctor_id")
    patient_id = get_attr(medical_visit, "patient_id")
    start_time = _as_utc(get_attr(medical_visit, "start_time"))
    end_time = _as_utc(get_attr(medical_visit, "end_time"))
    visit_type = normalize_visit_type(get_attr(medical_visit, "visit_type") or "consultation")
    visit_details = get_attr(medical_visit, "visit_details")

    appointment_id = await db_manager.fetchval(
        """UPDATE public.medical_visits
           SET end_time = $4, visit_type = $5::visit_type_enum, visit_details = $6
           WHERE doctor_id = $1 AND patient_id = $2 AND start_time = $3
           RETURNING id""",
        doctor_id, patient_id, start_time, end_time, visit_type, visit_details,
    )
    if appointment_id is None:
        return "No appointment was found at that time; nothing was changed."

    await _publish("AppointmentRescheduled", {
        "id": appointment_id, "appointment_id": appointment_id,
        "patient_id": patient_id, "doctor_id": doctor_id,
        "start_time": start_time.isoformat(), "end_time": end_time.isoformat(),
        "new_date": start_time.strftime("%B %d, %Y"), "new_time": start_time.strftime("%I:%M %p"),
        "visit_type": visit_type, "visit_details": visit_details,
    })
    return "Appointment details updated."


@function_tool
async def delete_booking(medical_visit: MedicalVisit):
    """
    Permanently cancel an existing appointment.

    INTENT
    ------
    Use only after explicit user confirmation.

    HARD RULES
    ----------
    - MUST confirm intent before calling
    - MUST NOT recreate automatically
    """
    start_time = _as_utc(get_attr(medical_visit, "start_time"))
    patient_id = get_attr(medical_visit, "patient_id")
    doctor_id = get_attr(medical_visit, "doctor_id")

    appointment_id = await db_manager.fetchval(
        """DELETE FROM public.medical_visits
           WHERE doctor_id = $1 AND patient_id = $2 AND start_time = $3
           RETURNING id""",
        doctor_id, patient_id, start_time,
    )
    if appointment_id is None:
        return "No appointment was found at that time; nothing was cancelled."

    await _publish("AppointmentCancelled", {
        "id": appointment_id, "appointment_id": appointment_id,
        "patient_id": patient_id, "doctor_id": doctor_id,
        "start_time": start_time.isoformat(), "visit_type": get_attr(medical_visit, "visit_type"),
    })
    return "Appointment cancelled."
