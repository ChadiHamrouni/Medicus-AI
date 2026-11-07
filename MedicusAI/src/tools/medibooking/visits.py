from typing import Optional, Dict, Any
from datetime import datetime, UTC, timedelta

from agents import function_tool

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.models.medical.context import MedicalContext

from medicus_common.models.medical.visits import (
    MedicalVisitRecord,
    MedicalVisitsResponse,
    project_visit_status,
    build_visit_entry,
    group_visits_by_status,
    sort_upcoming_visits,
    sort_ongoing_visits,
    sort_past_visits,
    calculate_visit_counts
)


@function_tool
async def get_medical_visits(
    medical_context: MedicalContext,
    time_range: Optional[str] = None,
    upcoming_only: bool = False
) -> Dict[str, Any]:
    """
    Retrieve a patient's scheduled and past medical visits with the current doctor.

    INTENT
    ------
    Use this tool to:
    - verify an existing booking
    - confirm upcoming appointments
    - retrieve visit history

    STATE TRANSITION
    ----------------
    This tool DOES NOT modify state.
    It informs whether follow-up actions are required.

    PARAMETERS
    ----------
    medical_context : MedicalContext
        Context containing patient_id and doctor_id extracted from system message.

    time_range : str, optional
        Filters visits (e.g. "past", "next_30_days").

    upcoming_only : bool
        If true, return only future appointments.

    RETURNS
    -------
    Dict[str, Any]
        Includes visit identifiers, times, provider names, and visit_type.
        Only returns visits associated with the current doctor.

    HARD RULES
    ----------
    - MUST be called before update_booking or delete_booking
    - Agent MUST verify booking existence before mutation
    - Only returns visits where the current doctor is involved
    """

    patient_id = medical_context.patient_id
    doctor_id = medical_context.doctor_id

    if not isinstance(patient_id, int):
        raise ValidationError("patient_id must be an integer.")

    base_query = """
        SELECT
            id, patient_id, doctor_id, doctor_name,
            hc_provider_id, healthcare_provider_name,
            start_time, end_time,
            visit_type, visit_details,
            created_at, updated_at, created_by
        FROM public.medical_visits_view
        WHERE patient_id = $1 AND doctor_id = $2
    """

    if upcoming_only:
        query = f"{base_query} AND start_time > NOW()"
    else:
        three_years = (datetime.now(UTC) - timedelta(days=3 * 365)).isoformat()
        time_filter = f"start_time >= '{time_range if time_range else three_years}'"
        query = f"""
            {base_query}
            AND (
                start_time > NOW()
                OR (start_time <= NOW() AND (end_time IS NULL OR end_time >= NOW()))
                OR ({time_filter})
            )
        """
    try:
        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(query, patient_id, doctor_id)

        all_entries = []
        for row in rows:
            record = MedicalVisitRecord(
                id=row['id'],
                patient_id=row['patient_id'],
                doctor_id=row['doctor_id'],
                doctor_name=row['doctor_name'],
                hc_provider_id=row['hc_provider_id'],
                healthcare_provider_name=row['healthcare_provider_name'],
                start_time=row['start_time'],
                end_time=row['end_time'],
                visit_type=row['visit_type'],
                visit_details=row['visit_details'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                created_by=row['created_by']
            )
            status = project_visit_status(record)
            all_entries.append(build_visit_entry(record, status))

        grouped = group_visits_by_status(all_entries)
        return MedicalVisitsResponse(
            patient_id=patient_id,
            upcoming=sort_upcoming_visits(grouped["upcoming"]),
            ongoing=sort_ongoing_visits(grouped["ongoing"]),
            past=sort_past_visits(grouped["past"]),
            counts=calculate_visit_counts(all_entries)
        ).model_dump()

    except Exception as e:
        logger.debug(f"\n❌ EXCEPTION in get_medical_visits: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        logger.error("get_medical_visits_failed", error=str(e), patient_id=patient_id)
        raise DatabaseError(f"Failed to retrieve visits: {e}")