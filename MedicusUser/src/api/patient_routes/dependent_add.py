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
    CreateDependentPatientRequest,
    DependentPatientResponse,

)
from medicus_common.models.user import User
from src.services.patient.dependent_service import dependent_service
from src.api.auth_routes.auth_login import get_current_user

logger = structlog.get_logger()

# Create router
router = APIRouter(
    tags=["dependents"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/create", response_model=DependentPatientResponse)
async def create_dependent_patient(
    request: CreateDependentPatientRequest,
    current_user: User = Depends(get_current_user),
) -> DependentPatientResponse:
    """Create a new dependent patient for the authenticated user."""
    try:
        logger.info(
            "Creating dependent patient",
            user_id=current_user.id,
            relationship=request.relationship.value,
        )

        dependent = await dependent_service.create_dependent_patient(
            user_id=current_user.id, request=request
        )

        return dependent

    except UserNotFoundError as e:
        logger.warning(
            "User not found for dependent creation",
            user_id=current_user.id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        logger.warning(
            "Validation error creating dependent", user_id=current_user.id, error=str(e)
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error creating dependent", user_id=current_user.id, error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create dependent patient",
        )


