"""Doctor agenda tool for retrieving all upcoming events for a doctor.

This tool combines data from multiple materialized views to provide a unified
calendar view of all upcoming appointments, procedures, and events for a doctor
across all their patients.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, UTC, timedelta, date

from agents import function_tool

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.models.medical.context import MedicalContext
from medicus_common.models.doctor.doctor_view import (
    DoctorAgendaResponse,
    DoctorAgendaAppointmentEntry,
    DoctorAgendaProcedureEntry,
    DoctorAgendaDateRange,
    DoctorAgendaCounts
)


@function_tool
async def get_doctor_agenda(
    medical_context: MedicalContext,
    start_date: Optional[datetime | str] = None,
    end_date: Optional[datetime | str] = None,
    upcoming_only: bool = True
) -> DoctorAgendaResponse:
    """
    Retrieve all upcoming appointments, procedures, and events for the current doctor.

    INTENT
    ------
    Use this tool when the doctor asks to see their schedule, agenda, or upcoming events
    across ALL patients. This provides a unified calendar view.

    Examples:
    - "What's my schedule today?"
    - "Show me all my appointments this week"
    - "What procedures do I have scheduled?"
    - "Give me all my medical visits"

    STATE TRANSITION
    ----------------
    This tool DOES NOT modify state.
    It aggregates read-only data from multiple materialized views.

    PARAMETERS
    ----------
    medical_context : MedicalContext
        Context containing doctor_id extracted from system message.

    start_date : datetime or str, optional
        Start date for filtering events. Defaults to now.

    end_date : datetime or str, optional
        End date for filtering events. Defaults to 30 days from now.

    upcoming_only : bool
        If True, only return future events. Defaults to True.

    RETURNS
    -------
    Dict[str, Any]
        Unified agenda containing:
        - appointments: List of scheduled patient visits
        - procedures: List of scheduled medical procedures
        - total_count: Total number of events
        - date_range: Start and end dates for the query
        - grouped_by_date: Events organized by date

    HARD RULES
    ----------
    - Returns events for the current doctor across ALL patients.
    - Does NOT require patient_id (unlike get_medical_visits).
    - Only shows events where the doctor is the primary provider.
    """

    doctor_id = medical_context.doctor_id

    if not isinstance(doctor_id, int):
        raise ValidationError("doctor_id must be an integer.")

    # Set default date range
    now = datetime.now(UTC)
    if start_date:
        if isinstance(start_date, str):
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_dt = start_date
    else:
        start_dt = now

    if end_date:
        if isinstance(end_date, str):
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = end_date
    else:
        end_dt = now + timedelta(days=30)

    try:
        async with db_manager.get_connection() as conn:
            # QUERY 1: Get all appointments (medical_visits_view)
            visits_query = """
                SELECT
                    id,
                    patient_id,
                    doctor_id,
                    doctor_name,
                    hc_provider_id,
                    healthcare_provider_name,
                    start_time,
                    end_time,
                    visit_type,
                    visit_details,
                    created_at,
                    updated_at
                FROM public.medical_visits_view
                WHERE doctor_id = $1
                  AND start_time >= $2
                  AND start_time <= $3
                ORDER BY start_time ASC
            """

            visits_rows = await conn.fetch(visits_query, doctor_id, start_dt, end_dt)

            # QUERY 2: Get all scheduled procedures (medical_procedures_view)
            procedures_query = """
                SELECT
                    id,
                    patient_id,
                    doctor_id,
                    doctor_name,
                    display_name,
                    hc_provider_id,
                    healthcare_provider_name,
                    scheduled_date,
                    scheduled_time,
                    location,
                    procedure_code,
                    cpt_code,
                    icd10_pcs_code,
                    summary,
                    status,
                    created_at,
                    updated_at
                FROM public.medical_procedures_view
                WHERE doctor_id = $1
                  AND status = 'scheduled'
                  AND scheduled_date >= $2::date
                  AND scheduled_date <= $3::date
                ORDER BY scheduled_date ASC, scheduled_time ASC
            """

            procedures_rows = await conn.fetch(procedures_query, doctor_id, start_dt.date(), end_dt.date())

        # Build appointments list
        appointments = []
        for row in visits_rows:
            appointments.append(DoctorAgendaAppointmentEntry(
                event_type='appointment',
                id=row['id'],
                patient_id=row['patient_id'],
                start_time=row['start_time'].isoformat() if row['start_time'] else None,
                end_time=row['end_time'].isoformat() if row['end_time'] else None,
                visit_type=row.get('visit_type'),
                visit_details=row.get('visit_details'),
                location=row.get('healthcare_provider_name'),
                created_at=row['created_at'].isoformat() if row['created_at'] else None
            ))

        # Build procedures list
        procedures = []
        for row in procedures_rows:
            event_datetime = None
            if row['scheduled_date']:
                event_datetime = datetime.combine(row['scheduled_date'], datetime.min.time())
                if row.get('scheduled_time'):
                    event_datetime = datetime.combine(row['scheduled_date'], row['scheduled_time'])

            procedures.append(DoctorAgendaProcedureEntry(
                event_type='procedure',
                id=row['id'],
                patient_id=row['patient_id'],
                procedure_name=row.get('display_name'),
                scheduled_date=row['scheduled_date'].isoformat() if row['scheduled_date'] else None,
                scheduled_time=row['scheduled_time'].isoformat() if row.get('scheduled_time') else None,
                event_datetime=event_datetime.isoformat() if event_datetime else None,
                location=row.get('location') or row.get('healthcare_provider_name'),
                procedure_code=row.get('procedure_code'),
                cpt_code=row.get('cpt_code'),
                status=row.get('status'),
                summary=row.get('summary'),
                created_at=row['created_at'].isoformat() if row['created_at'] else None
            ))

        # Group events by date
        grouped_by_date = _group_events_by_date(appointments, procedures)

        # Build response
        response = DoctorAgendaResponse(
            doctor_id=doctor_id,
            date_range=DoctorAgendaDateRange(
                start=start_dt.isoformat(),
                end=end_dt.isoformat()
            ),
            appointments=appointments,
            procedures=procedures,
            total_count=len(appointments) + len(procedures),
            counts=DoctorAgendaCounts(
                appointments=len(appointments),
                procedures=len(procedures)
            ),
            grouped_by_date=grouped_by_date
        )

        logger.info(
            f"get_doctor_agenda: Retrieved {len(appointments)} appointments and "
            f"{len(procedures)} procedures for doctor_id={doctor_id}"
        )

        return response

    except Exception as e:
        logger.error(f"get_doctor_agenda_failed: {e} (doctor_id={doctor_id})")
        raise DatabaseError(f"Failed to retrieve doctor agenda: {e}")


def _group_events_by_date(appointments: List[Any], procedures: List[Any]) -> Dict[str, List[Dict]]:
    """Group all events by their date for calendar display."""
    grouped: Dict[str, List[Dict]] = {}

    def as_dict(e: Any) -> Dict[str, Any]:
        return e.model_dump() if hasattr(e, "model_dump") else dict(e)

    for appt in map(as_dict, appointments):
        if appt.get('start_time'):
            event_date = datetime.fromisoformat(appt['start_time']).date().isoformat()
            grouped.setdefault(event_date, []).append(appt)

    for proc in map(as_dict, procedures):
        if proc.get('scheduled_date'):
            grouped.setdefault(proc['scheduled_date'], []).append(proc)

    for date_key in grouped:
        grouped[date_key].sort(key=lambda x: x.get('start_time') or x.get('event_datetime') or '')

    return grouped