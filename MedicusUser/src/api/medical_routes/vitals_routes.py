"""Medical profile (vitals) API endpoints for MedicusUser.

Provides read-only access to medical vitals data.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from medicus_common.models.medical.vitals import MedicalVitalsResponse
from medicus_common.models.user import User
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import patient_reader
from src.services.medical.vitals_service import medical_vitals_service

router = APIRouter(prefix="/vitals", tags=["Medical Vitals"])


@router.get("/patients/{patient_id}", response_model=MedicalVitalsResponse)
async def get_patient_vitals(
    patient_id: int,
    current_user: User = Depends(patient_reader)
):
    """Get latest medical vitals for a patient.

    Returns latest vitals grouped by category (vitals, lifestyle, body_metrics, etc.).

    Args:
        patient_id: ID of the patient
        current_user: Authenticated user making the request

    Returns:
        Dict containing latest vitals grouped by category

    Raises:
        HTTPException: 400 for validation errors, 403 for unauthorized, 500 for server errors
    """
    try:
        vitals = await medical_vitals_service.get_latest_medical_vitals(
            patient_id=patient_id
        )

        return vitals

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}, patient_id: {patient_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(f"Database error: {str(e)}, patient_id: {patient_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve medical vitals"
        )


@router.get("/patients/{patient_id}/history/{vital_id}")
async def get_vital_history(
    patient_id: int,
    vital_id: int,
    limit: int = 30,
    current_user: User = Depends(patient_reader)
):
    """Get historical values for a specific vital to display in a graph.

    Returns historical data points for a specific vital measurement.

    Args:
        patient_id: ID of the patient
        vital_id: ID of the vital
        limit: Maximum number of historical points (default: 30, max: 100)
        current_user: Authenticated user making the request

    Returns:
        Dict containing historical vital data with timestamps

    Raises:
        HTTPException: 400 for validation errors, 500 for server errors
    """
    try:
        history = await medical_vitals_service.get_vital_history(
            patient_id=patient_id,
            vital_id=vital_id,
            limit=limit
        )

        return history

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}, patient_id: {patient_id}, vital_id: {vital_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(f"Database error: {str(e)}, patient_id: {patient_id}, vital_id: {vital_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve vital history"
        )