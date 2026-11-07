"""Medical vitals tools for Sara AI agents.

Provides tools for retrieving and reporting patient vital signs and lifestyle measurements.
Uses materialized views for reads and stores raw clinician input for later medical coding.

Pattern: Same as procedures
- Real-time: Store vitals in clinician's language (vital_values JSONB)
- Offline batch: Map to standardized vital_keys from vital_reference_ranges
"""

import json
from typing import Dict, Any
from datetime import datetime, timezone

from agents import function_tool
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError
from src.tools.mediclinic.helpers import _insert_audit

from medicus_common.models.audit.audit_context import AuditContext
from medicus_common.models.medical.context import MedicalContext
from medicus_common.models.medical.vitals import (
    MedicalVitalsInput,
    MedicalVitalsSimpleResponse,
    MedicalVitalEntry
)


@function_tool
async def get_medical_vitals(
    medical_context: MedicalContext
) -> MedicalVitalsSimpleResponse:
    """
    Retrieve recorded clinical vitals and lifestyle measurements.

    INTENT
    ------
    Use this tool to answer questions about a patient's physical health.

    STATE TRANSITION
    ----------------
    - Read-only retrieval.
    - Returns semantically grouped vitals from materialized view.

    PARAMETERS
    ----------
    medical_context : MedicalContext
        Context containing patient_id extracted from system message.

    RETURNS
    -------
    MedicalVitalsSimpleResponse
        Latest vitals data containing:
        - patient_id: Patient identifier
        - vitals: List of most recent vital signs (one per vital type)
        - count: Total number of vital types

    HARD RULES
    ----------
    - MUST NOT infer missing values.
    - patient_id MUST come from system message via medical_context.
    - After calling this tool, scan the conversation history for assistant messages
      that confirm a vital was recorded (e.g. "Recorded — blood pressure X saved",
      "blood pressure X mmHg saved", or similar confirmation phrases from report_medical_vitals).
      Extract the vital type and value from those confirmations and SILENTLY ADD them
      to the top of the vitals list you present, marked as "(just recorded, today)".
      If the same vital type appears in both the confirmation and these results,
      the confirmed value is more recent — show it instead.
      Never mention materialized views, data sources, or any technical detail to the doctor.
    """
    patient_id = medical_context.patient_id

    try:
        query = """
            SELECT
                id,
                patient_id,
                doctor_name,
                healthcare_provider_name,
                recorded_at,
                vital_id,
                vital_category,
                vital_value,
                display_name,
                convo_id,
                message_id,
                tool,
                actor_role,
                actor_user_id
            FROM public.medical_vitals_latest_view
            WHERE patient_id = $1
            ORDER BY vital_category, display_name
        """

        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(query, patient_id)

        vitals_list = []
        for row in rows:
            entry = MedicalVitalEntry(
                id=row['id'],
                patient_id=row['patient_id'],
                doctor_name=row['doctor_name'],
                healthcare_provider_name=row['healthcare_provider_name'],
                recorded_at=row['recorded_at'],
                vital_id=row['vital_id'],
                vital_category=row['vital_category'],
                vital_value=row['vital_value'],
                display_name=row['display_name'],
                vital_text=None,
                unit=None,
                convo_id=row['convo_id'],
                message_id=row['message_id'],
                tool=row['tool'],
                actor_role=row['actor_role'],
                actor_user_id=row['actor_user_id']
            )
            vitals_list.append(entry)

        return MedicalVitalsSimpleResponse(
            patient_id=patient_id,
            vitals=vitals_list,
            count=len(vitals_list)
        )

    except Exception as e:
        logger.error(f"get_medical_vitals_failed: {e} (patient_id={patient_id})")
        raise DatabaseError(f"Failed to retrieve medical vitals: {str(e)}")


@function_tool
async def report_medical_vitals(
    medical_context: MedicalContext,
    medical_data: MedicalVitalsInput,
    audit_context: AuditContext,
) -> Dict[str, Any]:
    """
    Record new clinical vital measurements for a patient.

    INTENT
    ------
    Use this tool to document vitals collected during a visit or examination.
    Records vitals exactly as spoken by the clinician in their language.
    Medical coding maps to standard vital_keys later via offline batch process.

    STATE TRANSITION
    ----------------
    - Creates a new vitals record with raw clinician input.
    - vital_values stores the raw JSONB as provided by clinician.
    - Database triggers handle materialized view refresh asynchronously.

    PARAMETERS
    ----------
    medical_context : MedicalContext
        Context containing patient_id, doctor_id from system message.
    medical_data : MedicalVitalsInput
        Contains vital_values list with vitals in clinician's language.
        Example: [{"vital_text": "tension artérielle", "vital_value": "135/85"},
                  {"vital_text": "pouls", "vital_value": "72"}]
    audit_context : AuditContext
        Automatically injected audit metadata.

    RETURNS
    -------
    Dict[str, Any]
        The newly created vitals record with id and recorded_at.
        If this function returns successfully, the vitals were recorded.
        TRUST THIS RESPONSE - do NOT call get_medical_vitals to verify.

    HARD RULES
    ----------
    - MUST NOT infer or fabricate vitals.
    - MUST store vitals exactly as provided by clinician.
    - patient_id and doctor_id MUST come from system message.
    - Vitals are APPEND-ONLY. You cannot supersede or delete previous vitals.
    - To correct a vital, simply record the new correct value.
    - If this tool returns {"status": "success"}, the vitals were recorded successfully.
    - DO NOT call get_medical_vitals immediately after to verify.
    - DO NOT call supersede_medical_note for vitals - that tool is only for clinical notes.
    """
    try:
        recorded_at = datetime.now(timezone.utc)

        # Build meta_data for audit trail
        meta_data = {
            "actor_user_id": audit_context.actor_user_id,
            "actor_role": audit_context.actor_role,
            "tool": "report_medical_vitals",
            "convo_id": audit_context.convo_id,
            "message_id": audit_context.message_id,
            "created_at": recorded_at.isoformat()
        }

        # Convert List[VitalValue] to list of dicts for JSONB storage
        vital_values_list = [
            {"vital_text": v.vital_text, "vital_value": v.vital_value}
            for v in medical_data.vital_values
        ]

        insert_query = """
            INSERT INTO public.medical_vitals
            (patient_id, doctor_id, healthcare_provider_id, recorded_at, meta_data, vital_values, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'active')
            RETURNING id, recorded_at
        """

        async with db_manager.get_connection() as conn:
            row = await conn.fetchrow(
                insert_query,
                medical_context.patient_id,
                medical_context.doctor_id,
                medical_context.healthcare_provider_id,
                recorded_at,
                json.dumps(meta_data),
                json.dumps(vital_values_list)
            )

        if row is None:
            raise DatabaseError("INSERT returned no row")

        result = {
            "status": "success",
            "message": "Vitals recorded successfully",
            "id": row["id"],
            "recorded_at": row["recorded_at"].isoformat(),
            "vital_values": vital_values_list,
            "_context_window_priority": (
                "These vitals were just recorded and may not appear yet in get_medical_vitals results. "
                "When showing the patient's vitals, silently include these alongside get_medical_vitals output. "
                "Do NOT mention data sources, views, or any technical detail to the doctor."
            ),
        }

        await _insert_audit(
            audit_context.actor_user_id,
            audit_context.actor_role,
            "report_medical_vitals",
            vital_values_list,
            result,
            audit_context.convo_id,
            audit_context.message_id
        )

        # TEMPORARY: Manual refresh for testing only - DB triggers should handle this
        # TODO: Remove after confirming triggers are working properly

        return result

    except Exception as e:
        logger.error(f"report_medical_vitals_failed: {e} (patient_id={medical_context.patient_id})")
        raise DatabaseError(f"Failed to report medical vitals: {str(e)}")