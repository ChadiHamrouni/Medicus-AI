from typing import Dict, Any
from datetime import datetime
from agents import function_tool

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError, DatabaseError

from medicus_common.models.medical.medications import (
    MedicationRecord,
    MedicationEntry,
    MedicationsResponse,
    MedicationCounts,
    project_medication_status,
    calculate_medication_progress
)


@function_tool
async def get_medications(
        patient_id: int,
        active_only: bool = False
) -> Dict[str, Any]:
    """
    Retrieve a patient's medication list with semantic clinical grouping.

    INTENT
    ------
    Use this tool to answer questions about what medications a patient is
    currently taking or has taken in the past.

    This tool is read-only and safe for patient-facing queries.

    PARAMETERS
    ----------
    patient_id : int
        Unique identifier of the patient.

    active_only : bool
        If True:
            - Returns only active/current prescriptions
            - Faster and recommended for routine checks
        If False:
            - Returns both active and historical medications

    RETURNS
    -------
    Dict[str, Any]
        A MedicationsResponse containing:
        - active (List[MedicationEntry])
        - past (List[MedicationEntry])
        - total_count (int)

    STATE BEHAVIOR
    --------------
    - Read-only
    - No database mutation
    - No side effects

    HARD RULES
    ----------
    - Do NOT infer adherence or effectiveness
    - Do NOT generate medical advice
    - Present facts only as recorded
    """

    if not isinstance(patient_id, int):
        raise ValidationError("patient_id must be an integer.")

    # Shared base columns from medications_view
    base_select = """
        SELECT id, patient_id, doctor_id, doctor_name, medication_name, dose, 
               frequency, duration_days, form, notes, start_date, 
               end_date, date_prescribed
        FROM public.medications_view
        WHERE patient_id = $1
    """

    try:
        current_entries = []
        previous_entries = []

        async with db_manager.get_connection() as conn:
            # QUERY 1: Active Medications
            current_rows = await conn.fetch(
                f"{base_select} AND status = 'active' ORDER BY start_date DESC",
                patient_id
            )
            current_entries = [_map_row_to_entry(row) for row in current_rows]

            # QUERY 2: Past Medications (Optional)
            if not active_only:
                previous_rows = await conn.fetch(
                    f"{base_select} AND status = 'past' ORDER BY start_date DESC",
                    patient_id
                )
                previous_entries = [_map_row_to_entry(row) for row in previous_rows]

        response = MedicationsResponse(
            patient_id=patient_id,
            current=current_entries,
            previous=previous_entries,
            counts=MedicationCounts(
                current=len(current_entries),
                previous=len(previous_entries),
                total=len(current_entries) + len(previous_entries)
            )
        )

        return response.model_dump()

    except Exception as e:
        logger.error_with_context("get_medications_failed", error=str(e), patient_id=patient_id)
        raise DatabaseError(f"Failed to retrieve medications: {e}")


def _map_row_to_entry(row) -> MedicationEntry:
    """Helper to project raw view row into semantic MedicationEntry."""
    record = MedicationRecord(
        id=row['id'],
        patient_id=row['patient_id'],
        doctor_id=row['doctor_id'],
        prescribed_by=row['doctor_name'],
        medication_name=row['medication_name'],
        dose=row['dose'],
        frequency=row['frequency'],
        duration_days=row['duration_days'],
        form=row['form'],
        instructions=row['notes'],
        start_date=row['start_date'],
        end_date=row['end_date'],
        prescribed_at=row['date_prescribed'],
        created_at=datetime.now(),
        source="clinician"
    )

    days_taken, days_left = calculate_medication_progress(
        record.start_date, record.end_date, record.duration_days
    )

    return MedicationEntry(
        id=record.id,
        medication_name=record.medication_name,
        form=record.form,
        dose=record.dose,
        frequency=record.frequency,
        start_date=record.start_date,
        end_date=record.end_date,
        status=project_medication_status(record),
        duration_days=record.duration_days,
        days_taken=days_taken,
        days_left=days_left,
        instructions=record.instructions,
        prescribed_by=record.prescribed_by,
        prescribed_at=record.prescribed_at,
        source="clinician"
    )