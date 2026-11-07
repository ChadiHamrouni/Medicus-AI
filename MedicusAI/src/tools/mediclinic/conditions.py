"""Medical conditions tools for Sara AI agents.

VIEW SCHEMA (medical_conditions_latest_view and medical_conditions_view):
- id, patient_id, doctor_id, doctor_name
- diagnosis_date, condition_id, condition_text, display_name
- icd10, category, severity, is_chronic
- resolved_date, is_active, clinical_notes, created_at, clinical_status

NEW ARCHITECTURE (Post-Refactor):
- Master knowledge base: conditions table with ICD10, is_chronic, category
- Patient records: medical_conditions links to knowledge base via condition_id
- Views provide: display_name, clinical_status, icd10, category, is_chronic
- Records are IMMUTABLE (no updates, no deletes)
- clinical_status computed by view (resolved > chronic > active)

All tools use materialized views and enforce strict audit trails.
"""

from typing import Dict, Any

from agents import function_tool

from src.tools.mediclinic.helpers import _insert_audit

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.models.audit.audit_context import AuditContext
from medicus_common.models.medical.context import MedicalContext
from medicus_common.models.medical.conditions import (
    MedicalConditionEntry,
    MedicalConditionsResponse,
    MedicalConditionsCounts,
    MedicalConditionInput,
    group_conditions_by_status
)


@function_tool
async def get_medical_conditions(
    medical_context: MedicalContext,
    active_only: bool = True
) -> Dict[str, Any]:
    """
    Retrieve a patient's diagnosed medical conditions, grouped by clinical status.

    INTENT
    ------
    Use this tool when the user asks about a patient's known diagnoses,
    problem list, chronic illnesses, or resolved conditions.

    STATE TRANSITION
    ----------------
    - Read-only operation.
    - Queries the medical_conditions_view.
    - Performs semantic grouping into active, chronic, and resolved conditions.
    - Does NOT create, modify, or invalidate any records.

    PARAMETERS
    ----------
    medical_context : MedicalContext
        Context containing patient_id extracted from system message.

    active_only : bool
        If True:
        - Returns only conditions that are currently active or marked as chronic.
        If False:
        - Returns all conditions, including resolved ones.
        Defaults to True.

    RETURNS
    -------
    Dict[str, Any]
        Structured response containing grouped medical conditions:
        - active
        - chronic
        - resolved
        Each entry includes diagnosis metadata and clinician notes.

    HARD RULES
    ----------
    - MUST NOT infer conditions not present in the database.
    - MUST return empty groups if no conditions exist.
    - MUST NOT modify condition state.
    """

    patient_id = medical_context.patient_id
    doctor_id = medical_context.doctor_id

    if not isinstance(patient_id, int):
        raise ValidationError("patient_id must be an integer.")

    # Query view - all columns match view schema
    base_query = """
        SELECT id, patient_id, doctor_id, doctor_name,
               diagnosis_date, condition_id, condition_text, display_name,
               icd10, category, severity, is_chronic,
               resolved_date, is_active, clinical_notes,
               created_at, clinical_status
        FROM public.medical_conditions_view
        WHERE patient_id = $1 AND doctor_id = $2
    """

    try:
        active_chronic_entries = []
        resolved_entries = []

        async with db_manager.get_connection() as conn:
            # QUERY 1: Active and Chronic (The primary clinical view)
            active_rows = await conn.fetch(
                f"{base_query} AND is_active = True ORDER BY diagnosis_date DESC",
                patient_id, doctor_id
            )
            active_chronic_entries = [_map_row_to_entry(row) for row in active_rows]

            # QUERY 2: Resolved (Historical)
            if not active_only:
                resolved_rows = await conn.fetch(
                    f"{base_query} AND is_active = False ORDER BY resolved_date DESC",
                    patient_id, doctor_id
                )
                resolved_entries = [_map_row_to_entry(row) for row in resolved_rows]

        all_entries = active_chronic_entries + resolved_entries
        grouped = group_conditions_by_status(all_entries)

        response = MedicalConditionsResponse(
            patient_id=patient_id,
            active=grouped.get("active", []),
            chronic=grouped.get("chronic", []),
            resolved=grouped.get("resolved", []),
            counts=MedicalConditionsCounts(
                active=len(grouped.get("active", [])),
                chronic=len(grouped.get("chronic", [])),
                resolved=len(grouped.get("resolved", [])),
                total=len(all_entries)
            )
        )

        return response.model_dump()

    except Exception as e:
        logger.error(f"get_medical_conditions_failed: {e} (patient_id={patient_id})")
        raise DatabaseError(f"Failed to retrieve conditions: {e}")

@function_tool
async def report_medical_condition(
    medical_context: MedicalContext,
    medical_data: MedicalConditionInput,
    audit_context: AuditContext
) -> Dict[str, Any]:
    """
    Record a new medical condition or diagnosis for a patient.

    INTENT
    ------
    Use this tool when a clinician formally diagnoses a new condition
    or adds a condition to the patient's problem list.

    NEW ARCHITECTURE:
    - Stores condition_id (FK to knowledge base) if available
    - Stores condition_text (raw clinician input) - REQUIRED
    - Optional condition_name override
    - icd10, is_chronic, category derived from knowledge base via condition_id
    - Records are IMMUTABLE - no updates allowed

    STATE TRANSITION
    ----------------
    - Creates a new IMMUTABLE condition record.
    - Database triggers handle materialized view refresh asynchronously.
    - Triggers audit logging.

    PARAMETERS
    ----------
    medical_context : MedicalContext
        Context containing patient_id, doctor_id extracted from system message.

    medical_data : MedicalConditionInput
        The condition data to record:
        - condition_id: Optional FK to conditions knowledge base
        - condition_text: Raw clinician input (REQUIRED)
        - condition_name: Optional display name override
        - diagnosis_date, severity, notes, is_active

    audit_context : AuditContext
        Automatically injected audit metadata.

    RETURN
    -------
    Dict[str, Any]
        The newly created condition record with id and status.
        If this function returns successfully, the condition was recorded.
        TRUST THIS RESPONSE - do NOT call get_medical_conditions to verify.

    HARD RULES
    ----------
    - Records are IMMUTABLE - no updates or deletes allowed.
    - MUST NOT infer severity or chronicity (derived from knowledge base).
    - MUST require audit context.
    - If this tool returns successfully, inform the user the condition was recorded.
    - DO NOT immediately call get_medical_conditions after this tool succeeds.
    """

    try:
        # Default diagnosis_date to today if not provided (database constraint: NOT NULL)
        from datetime import date
        diagnosis_date = medical_data.diagnosis_date or date.today()

        async with db_manager.get_connection() as conn:
            # NEW table schema - links to knowledge base, stores raw text
            query = """
                INSERT INTO public.medical_conditions
                (patient_id, doctor_id, condition_id, condition_text,
                 diagnosis_date, severity, notes, resolved_date, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            """

            row_id = await conn.fetchval(
                query,
                medical_context.patient_id,
                medical_context.doctor_id,
                medical_data.condition_id,      # FK to knowledge base (nullable)
                medical_data.condition_text,    # Raw clinician input (required)
                diagnosis_date,                 # Default to today if NULL
                medical_data.severity,
                medical_data.notes,
                medical_data.resolved_date,
                medical_data.is_active
            )

            result = {
                "status": "success",
                "message": "Condition recorded successfully",
                "id": row_id,
                "condition_text": medical_data.condition_text,
                "_context_window_priority": (
                    "This condition was just recorded and may not appear yet in get_medical_conditions results. "
                    "When showing the patient's conditions, silently include this alongside get_medical_conditions output. "
                    "Do NOT mention data sources, views, or any technical detail to the doctor."
                ),
            }

            await _insert_audit(
                audit_context.actor_user_id,
                audit_context.actor_role,
                "report_medical_condition",
                {
                    "condition_text": medical_data.condition_text,
                    "condition_id": medical_data.condition_id,
                    "patient_id": medical_context.patient_id
                },
                result,
                audit_context.convo_id,
                audit_context.message_id
            )

            # TEMPORARY: Manual refresh for testing only - DB triggers should handle this
            # TODO: Remove after confirming triggers are working properly

            logger.info(f"report_medical_condition_success: id={row_id}, patient={medical_context.patient_id}")
            return result

    except Exception as e:
        logger.error(f"report_medical_condition_failed: {e} (patient_id={medical_context.patient_id})")
        raise DatabaseError(f"Failed to record condition: {e}")



def _map_row_to_entry(row) -> MedicalConditionEntry:
    """Map database row from medical_conditions_view to MedicalConditionEntry.

    VIEW SCHEMA:
    - id, patient_id, doctor_id, doctor_name
    - diagnosis_date, condition_id, condition_text, display_name
    - icd10, category, severity, is_chronic
    - resolved_date, is_active, clinical_notes, created_at, clinical_status

    Notes:
    - View provides display_name, clinical_status
    - icd10, category, is_chronic from knowledge base
    - No updated_at (records are immutable)
    """
    # Determine clinical status
    clinical_status = row.get('clinical_status')
    if not clinical_status:
        # Fallback status computation if view doesn't provide it
        if row.get('resolved_date') is not None:
            clinical_status = 'resolved'
        elif row.get('is_chronic', False):
            clinical_status = 'chronic'
        else:
            clinical_status = 'active'

    # Fallback: if display_name is NULL, use condition_text, then 'Unknown Condition'
    display_name = row['display_name'] or row.get('condition_text') or 'Unknown Condition'

    entry = MedicalConditionEntry(
        id=row['id'],
        patient_id=row['patient_id'],
        doctor_id=row.get('doctor_id'),
        doctor_name=row.get('doctor_name'),
        diagnosis_date=row.get('diagnosis_date'),
        created_at=row.get('created_at'),
        condition_id=row.get('condition_id'),
        condition_text=row.get('condition_text'),
        display_name=display_name,
        icd10=row.get('icd10'),
        category=row.get('category'),
        severity=row.get('severity'),
        is_chronic=row.get('is_chronic', False),
        resolved_date=row.get('resolved_date'),
        is_active=row.get('is_active', True),
        clinical_notes=row.get('clinical_notes'),
        clinical_status=clinical_status
    )

    return entry