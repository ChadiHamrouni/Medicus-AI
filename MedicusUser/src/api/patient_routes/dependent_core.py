# =============================================================================
# src/api/dependent_core.py
"""FastAPI routes for dependent patient management."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
import structlog

from medicus_common.core.exceptions import (
    UserNotFoundError,
    DatabaseError,
)

from medicus_common.models.patient.patient_dependents import (
    DependentPatientResponse,
    DependentPatientListResponse,
    SwitchContextRequest,
    SwitchContextResponse,
)
from medicus_common.models.user import User
from src.services.patient.dependent_service import dependent_service
from src.api.auth_routes.auth_login import get_current_user

logger = structlog.get_logger()

# Create router
router = APIRouter(
    prefix="/dependents",
    tags=["dependents"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=DependentPatientListResponse)
async def get_dependent_patients(
    include_main: bool = True, current_user: User = Depends(get_current_user)
) -> DependentPatientListResponse:
    """Get all dependent patients for the authenticated user."""
    try:
        dependents = await dependent_service.get_dependent_patients(
            user_id=current_user.id, include_main=include_main
        )

        return dependents

    except UserNotFoundError as e:
        logger.warning(
            "User not found for dependent retrieval",
            user_id=current_user.id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error retrieving dependents",
            user_id=current_user.id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dependent patients",
        )


@router.get("/{patient_id}", response_model=DependentPatientResponse)
async def get_dependent_patient(
    patient_id: int, current_user: User = Depends(get_current_user)
) -> DependentPatientResponse:
    """Get a specific dependent patient by ID."""
    try:
        dependent = await dependent_service.get_dependent_patient(
            user_id=current_user.id, patient_id=patient_id
        )

        return dependent

    except UserNotFoundError as e:
        logger.warning(
            "Dependent patient not found",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error retrieving dependent",
            user_id=current_user.id,
            patient_id=patient_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dependent patient",
        )


@router.post("/switch-context", response_model=SwitchContextResponse)
async def switch_dependent_context(
    request: SwitchContextRequest, current_user: User = Depends(get_current_user)
) -> SwitchContextResponse:
    """Switch to a dependent patient context for conversation management."""
    try:
        logger.info(
            "Switching to dependent context",
            user_id=current_user.id,
            target_patient_id=request.patient_id,
        )

        # Get the target patient that we're switching to
        target_patient = await dependent_service.get_dependent_patient(
            user_id=current_user.id, patient_id=request.patient_id
        )

        # Get all available patients for context switching
        all_patients = await dependent_service.get_dependent_patients(
            user_id=current_user.id, include_main=True
        )

        # Build the available patients list (main + dependents)
        available_patients = []
        if all_patients.main_patient:
            available_patients.append(all_patients.main_patient)
        available_patients.extend(all_patients.dependents)

        # Determine if this is dependent context
        is_dependent_context = target_patient.relationship.value != "main"

        response = SwitchContextResponse(
            active_patient_id=target_patient.id,
            active_patient=target_patient,
            is_dependent_context=is_dependent_context,
            available_patients=available_patients,
        )

        logger.info(
            "Successfully switched context",
            user_id=current_user.id,
            active_patient_id=target_patient.id,
            is_dependent_context=is_dependent_context,
        )

        return response

    except HTTPException:
        raise
    except UserNotFoundError as e:
        logger.warning(
            "User not found for context switch", user_id=current_user.id, error=str(e)
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error switching context",
            user_id=current_user.id,
            patient_id=request.patient_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to switch dependent context",
        )


@router.get("/context/available", response_model=List[DependentPatientResponse])
async def get_available_contexts(
    current_user: User = Depends(get_current_user),
) -> List[DependentPatientResponse]:
    """Get all available patient contexts for the user (main + dependents)."""
    try:
        logger.info("Retrieving available contexts")

        all_patients = await dependent_service.get_dependent_patients(
            user_id=current_user.id, include_main=True
        )

        # Combine main patient and dependents
        available_contexts = []
        if all_patients.main_patient:
            available_contexts.append(all_patients.main_patient)
        available_contexts.extend(all_patients.dependents)

        logger.info(
            "Retrieved available contexts",
            user_id=current_user.id,
            total_contexts=len(available_contexts),
        )

        return available_contexts

    except UserNotFoundError as e:
        logger.warning(
            "User not found for context retrieval",
            user_id=current_user.id,
            error=str(e),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DatabaseError as e:
        logger.error(
            "Database error retrieving contexts", user_id=current_user.id, error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve available contexts",
        )
