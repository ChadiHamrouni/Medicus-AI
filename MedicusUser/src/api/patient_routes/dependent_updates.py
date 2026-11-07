# =============================================================================
# src/api/dependent_core.py
"""FastAPI routes for dependent patient management."""

from fastapi import APIRouter, Depends, HTTPException, status
import structlog

from medicus_common.core.exceptions import (
    UserNotFoundError,
    ValidationError,
    DatabaseError,
)

from medicus_common.models.patient.patient_dependents import (
    UpdateDependentPatientRequest,
    DependentPatientResponse,
    DependentOperationResponse,
)
from medicus_common.models.user import User
from src.services.patient.dependent_service import dependent_service
from src.api.auth_routes.auth_login import get_current_user

logger = structlog.get_logger()

# Create router
router = APIRouter(
    prefix="",
    tags=["dependents"],
    dependencies=[Depends(get_current_user)],
)


@router.put("/{patient_id}", response_model=DependentPatientResponse)
async def update_dependent_patient(
    patient_id: int,
    request: UpdateDependentPatientRequest,
    current_user: User = Depends(get_current_user),
) -> DependentPatientResponse:
    """Update a dependent patient."""
    try:
        logger.info(
            "Updating dependent patient",
            user_id=current_user.id,
            patient_id=patient_id,
            updated_fields=list(request.dict(exclude_unset=True).keys()),
        )

        updated_dependent = await dependent_service.update_dependent_patient(
            user_id=current_user.id, patient_id=patient_id, request=request
        )

        return updated_dependent

    except UserNotFoundError as e:
        logger.warning(
            "Dependent patient not found for update",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        logger.warning(
            "Validation error updating dependent",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error updating dependent",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update dependent patient",
        )


@router.delete("/{patient_id}", response_model=DependentOperationResponse)
async def delete_dependent_patient(
    patient_id: int, current_user: User = Depends(get_current_user)
) -> DependentOperationResponse:
    """Delete a dependent patient."""
    try:
        logger.info(
            "Deleting dependent patient", user_id=current_user.id, patient_id=patient_id
        )

        success = await dependent_service.delete_dependent_patient(
            user_id=current_user.id, patient_id=patient_id
        )

        if success:
            return DependentOperationResponse(
                success=True, message="Dependent patient deleted successfully"
            )
        else:
            return DependentOperationResponse(
                success=False, message="Failed to delete dependent patient"
            )

    except UserNotFoundError as e:
        logger.warning(
            "Dependent patient not found for deletion",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        logger.warning(
            "Validation error deleting dependent",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error deleting dependent",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete dependent patient",
        )


