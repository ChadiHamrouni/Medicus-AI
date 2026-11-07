"""Medical procedures API endpoints for MedicusUser.

This module provides endpoints for patient medical procedures viewing.

Uses the procedures_view materialized view for all medical procedures.

Provides read-only access for patients to view their procedures.

WARNING: This endpoint is READ-ONLY.
All semantics live in MedicusAI agent tools.
This is a thin adapter layer for data transport only.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from medicus_common.models.user import User
from medicus_common.models.medical.procedures import MedicalProceduresResponse
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import patient_reader
from src.services.medical.procedures_service import procedure_service

router = APIRouter(prefix="/procedures", tags=["Medical Procedures"])


@router.get("/patients/{patient_id}", response_model=MedicalProceduresResponse)
async def get_patient_procedures(
    patient_id: int,
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(patient_reader)
):
    """Get all medical procedures for a patient.

    Retrieves all medical procedures (scheduled, completed, cancelled)
    from procedures_view. Returns procedures grouped by status.

    Args:
        patient_id: ID of the patient
        limit: Maximum number of results (1-500, default 100)
        offset: Number of results to skip for pagination
        current_user: Authenticated user making the request

    Returns:
        Dict containing:
        - procedures: Grouped by status (scheduled, completed, cancelled)
        - counts: Count for each status and total

    Raises:
        HTTPException: 400 for validation errors, 500 for server errors
    """
    try:
        result = await procedure_service.get_patient_procedures(
            patient_id=patient_id,
            limit=limit,
            offset=offset
        )
        return result

    except ValidationError as e:
        logger.error(
            f"Validation error getting procedures - error: {str(e)}, "
            f"patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(
            f"Database error getting procedures - error: {str(e)}, "
            f"patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve medical procedures"
        )


@router.get("/{procedure_id}/patients/{patient_id}")
async def get_procedure_details(
    procedure_id: int,
    patient_id: int,
    current_user: User = Depends(patient_reader)
):
    """Get detailed information for a specific procedure including clinical events.

    Retrieves a single procedure with complete clinical details including
    the chronological clinical events log from medical_procedure_details.

    Args:
        procedure_id: ID of the procedure
        patient_id: ID of the patient (for authorization)
        current_user: Authenticated user making the request

    Returns:
        Dict containing complete procedure data with clinical events log

    Raises:
        HTTPException: 400 for validation errors, 404 if not found, 500 for server errors
    """
    try:
        result = await procedure_service.get_procedure_by_id(
            procedure_id=procedure_id,
            patient_id=patient_id
        )

        return result

    except ValidationError as e:
        logger.error(
            f"Validation error getting procedure details - error: {str(e)}, "
            f"procedure_id: {procedure_id}, patient_id: {patient_id}, user_id: {current_user.id}"
        )
        # Check if it's a "not found" error
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(
            f"Database error getting procedure details - error: {str(e)}, "
            f"procedure_id: {procedure_id}, patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve procedure details"
        )