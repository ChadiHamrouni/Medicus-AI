"""Emergency Alert tools for MediDoc AI agents.

Provides high-priority tools for triggering clinical emergency protocols.
Uses Pydantic models for structured, validated responses.
"""

import json
from datetime import datetime, timezone
from agents import function_tool

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError
from src.tools.mediclinic.helpers import _insert_audit

from medicus_common.models.audit.audit_context import AuditContext
from medicus_common.models.medical.context import MedicalContext
from medicus_common.models.medical.emergency import EmergencyAlertResponse, EmergencyAlertInput

@function_tool
async def trigger_emergency_protocol(
    medical_context: MedicalContext,
    audit_context: AuditContext,
    emergency_data: EmergencyAlertInput
) -> EmergencyAlertResponse:
    """
    Trigger an immediate clinical emergency alert (e.g., Code Blue or EMS).

    INTENT
    ------
    Use this tool ONLY when a patient exhibits life-threatening symptoms (Red Flags)
    requiring immediate physical intervention.

    STATE TRANSITION
    ----------------
    - Persists a CRITICAL event to public.medical_events.
    - Triggers real-time hospital broadcast systems.

    PARAMETERS
    ----------
    medical_context : MedicalContext
        Context containing patient_id and doctor_id.
    audit_context : AuditContext
        Injected metadata for accountability.
    emergency_data : EmergencyAlertInput
        Validated input containing the reason and location.

    RETURNS
    -------
    EmergencyAlertResponse
        A structured pydantic model confirming dispatch details.
    """
    patient_id = medical_context.patient_id
    recorded_at = datetime.now(timezone.utc)

    # The model sometimes calls this twice in one turn: return the alert raised moments ago
    # instead of dispatching a duplicate.
    if patient_id is not None:
        recent = await db_manager.fetchrow(
            """SELECT id, recorded_at FROM public.medical_events
               WHERE patient_id = $1 AND event_type = 'EMERGENCY_ALERT' AND recorded_at > now() - interval '2 minutes'
               ORDER BY recorded_at DESC LIMIT 1""",
            patient_id,
        )
        if recent:
            return EmergencyAlertResponse(
                status="activated",
                message="Emergency protocol already active for this patient. Medical team notified.",
                protocol_id=f"EMG-{recent['id']}",
                dispatched_at=recent["recorded_at"].isoformat(),
                priority="CRITICAL",
            )

    try:
        # 1. Prepare clinical payload
        emergency_payload = {
            "patient_id": patient_id,
            "type": "CODE_BLUE_DISPATCH",
            "reason": emergency_data.reason,
            "location": emergency_data.location_detail,
            "actor_user_id": audit_context.actor_user_id
        }

        # 2. Database Persistence
        insert_query = """
            INSERT INTO public.medical_events 
            (patient_id, doctor_id, event_type, severity, description, meta_data, recorded_at)
            VALUES ($1, $2, 'EMERGENCY_ALERT', 'CRITICAL', $3, $4, $5)
            RETURNING id
        """

        async with db_manager.get_connection() as conn:
            row = await conn.fetchrow(
                insert_query,
                patient_id,
                medical_context.doctor_id,
                f"EMERGENCY: {emergency_data.reason}",
                json.dumps(emergency_payload),
                recorded_at
            )

        # 3. Create structured response
        response = EmergencyAlertResponse(
            status="activated",
            message="Emergency protocol activated. Medical team notified.",
            protocol_id=f"EMG-{row['id']}" if row else "EMG-LOCAL",
            dispatched_at=recorded_at.isoformat(),
            priority="CRITICAL"
        )

        # 4. Critical Audit Trail
        await _insert_audit(
            audit_context.actor_user_id,
            audit_context.actor_role,
            "trigger_emergency_protocol",
            emergency_payload,
            response.model_dump(),
            audit_context.convo_id,
            audit_context.message_id
        )

        logger.critical(f"EMERGENCY_ACTIVE: {patient_id} | ID: {response.protocol_id}")
        
        return response

    except Exception as e:
        logger.error(f"EMERGENCY_TOOL_FAILURE: {e} for patient {patient_id}")
        raise DatabaseError(f"Failed to activate emergency protocol: {str(e)}")