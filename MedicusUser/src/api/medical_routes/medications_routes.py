"""Medication API endpoints for MedicusUser.

Provides read-only endpoints using the medications_view materialized view.

Note: Prescriptions are created by doctors in MedicusAI using medications.py
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status

from medicus_common.models.user import User
from medicus_common.models.medical.medications import MedicationsResponse
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import patient_reader
from src.services.medical.medications_service import medication_service

router = APIRouter(prefix="/medications", tags=["Medications"])


@router.get("/patients/{patient_id}", response_model=MedicationsResponse)
async def get_patient_medications(
    patient_id: int,
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(patient_reader)
):
    """Get all medications for a patient.

    Standard endpoint matching other medical routes pattern.
    Returns all medications (active and past) for the patient.

    Args:
        patient_id: ID of the patient
        limit: Maximum number of results (1-500, default 100)
        offset: Number of results to skip for pagination
        current_user: Authenticated user making the request

    Returns:
        Dict containing all medications formatted for patient UI

    Raises:
        HTTPException: 400 for validation errors, 403 for unauthorized, 500 for server errors
    """
    logger.info(
        f"[MEDICATIONS] ===== REQUEST RECEIVED ===== patient_id: {patient_id}, user_id: {current_user.id}, "
        f"limit: {limit}, offset: {offset}"
    )

    try:
        logger.info(f"[MEDICATIONS] Calling medication_service.get_patient_medications for patient {patient_id}")
        medications = await medication_service.get_patient_medications(
            patient_id=patient_id,
            limit=limit,
            offset=offset
        )

        # Group by status: current vs previous (matching MedicationsResponse model)
        current_medications = [med for med in medications if med['status'] == 'current']
        previous_medications = [med for med in medications if med['status'] == 'previous']

        # Build MedicationsResponse structure
        response = {
            "patient_id": patient_id,
            "current": current_medications,
            "previous": previous_medications,
            "counts": {
                "current": len(current_medications),
                "previous": len(previous_medications),
                "total": len(medications)
            }
        }

        return response

    except ValidationError as e:
        logger.error(f"[MEDICATIONS] Validation error: {str(e)}, patient_id: {patient_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(f"[MEDICATIONS] Database error: {str(e)}, patient_id: {patient_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve medications"
        )
    except Exception as e:
        logger.error(f"[MEDICATIONS] Unexpected error: {str(e)}, patient_id: {patient_id}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@router.get("/patients/{patient_id}/summary")
async def get_patient_medication_summary(
    patient_id: int,
    recent: int = Query(5, ge=1, le=50, description="Number of recent prescriptions to include"),
    current_user: User = Depends(patient_reader),
):
    """Aggregate view of a patient's prescriptions (counts + most recent prescriptions)."""
    try:
        counts = await db_manager.fetchrow(
            """
            SELECT count(DISTINCT prescription_id)                          AS total_prescriptions,
                   count(*) FILTER (WHERE status = 'active')                AS active_medications_count,
                   count(DISTINCT lower(medication_name))                   AS unique_medications_count
            FROM public.medications_view WHERE patient_id = $1
            """,
            patient_id,
        )
        rows = await db_manager.fetch(
            """
            SELECT prescription_id, date_prescribed, doctor_name,
                   array_agg(medication_name ORDER BY id) FILTER (WHERE medication_name IS NOT NULL) AS medications
            FROM public.medications_view WHERE patient_id = $1
            GROUP BY prescription_id, date_prescribed, doctor_name
            ORDER BY date_prescribed DESC, prescription_id DESC
            LIMIT $2
            """,
            patient_id, recent,
        )
    except Exception:
        logger.exception(f"Failed to build medication summary for patient {patient_id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to retrieve medication summary")

    return {
        "patient_id": patient_id,
        "total_prescriptions": counts["total_prescriptions"] or 0,
        "active_medications_count": counts["active_medications_count"] or 0,
        "unique_medications_count": counts["unique_medications_count"] or 0,
        "recent_prescriptions": [
            {
                "date_prescribed": r["date_prescribed"].isoformat() if r["date_prescribed"] else None,
                "doctor_name": r["doctor_name"],
                "medication_count": len(r["medications"] or []),
                "medications": list(r["medications"] or []),
            }
            for r in rows
        ],
        "summary_generated_at": datetime.now(timezone.utc).isoformat(),
    }
