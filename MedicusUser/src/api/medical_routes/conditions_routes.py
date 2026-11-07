"""Medical conditions API endpoints for MedicusUser.

Provides read-only access to medical conditions data.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from medicus_common.models.medical.conditions import MedicalConditionsResponse
from medicus_common.models.user import User
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import patient_reader
from src.services.medical.conditions_service import medical_conditions_service

router = APIRouter(prefix="/conditions", tags=["Medical Conditions"])


@router.get("/patients/{patient_id}", response_model=MedicalConditionsResponse)
async def get_patient_conditions(
    patient_id: int,
    current_user: User = Depends(patient_reader)
):
    """Get medical conditions for a patient grouped by status.

    Returns conditions grouped into active, chronic, and resolved categories.

    Args:
        patient_id: ID of the patient
        current_user: Authenticated user making the request

    Returns:
        Dict containing conditions grouped by status with counts

    Raises:
        HTTPException: 400 for validation errors, 403 for unauthorized, 500 for server errors
    """
    try:
        conditions = await medical_conditions_service.get_conditions(
            patient_id=patient_id
        )

        return conditions

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
            detail="Failed to retrieve medical conditions"
        )
