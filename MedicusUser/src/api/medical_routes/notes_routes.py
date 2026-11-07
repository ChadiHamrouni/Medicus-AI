"""Medical notes API endpoints for MedicusUser.

This module provides endpoints for patient medical notes viewing.

Uses the medical_notes_view materialized view for all SOAP clinical notes.

Provides read-only access for patients to view their notes.

WARNING: This endpoint is READ-ONLY.
All semantics live in MedicusAI agent tools.
This is a thin adapter layer for data transport only.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from medicus_common.models.user import User
from medicus_common.models.medical.notes import MedicalNotesResponse
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import patient_reader
from src.services.medical.notes_service import note_service

router = APIRouter(prefix="/notes", tags=["Medical Notes"])


@router.get("/patients/{patient_id}", response_model=MedicalNotesResponse)
async def get_patient_notes(
    patient_id: int,
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(patient_reader)
):
    """Get all medical notes for a patient.

    Retrieves all SOAP clinical notes from medical_notes_view.
    Notes are ordered chronologically (most recent first).

    Args:
        patient_id: ID of the patient
        limit: Maximum number of results (1-500, default 100)
        offset: Number of results to skip for pagination
        current_user: Authenticated user making the request

    Returns:
        Dict containing:
        - notes: List of SOAP notes with full structure
        - total: Total count of notes

    Raises:
        HTTPException: 400 for validation errors, 500 for server errors
    """
    logger.info(
        f"Getting medical notes for patient {patient_id} - user_id: {current_user.id}, "
        f"limit: {limit}, offset: {offset}"
    )

    try:
        result = await note_service.get_patient_notes(
            patient_id=patient_id,
            limit=limit,
            offset=offset
        )

        logger.info(
            f"Retrieved {result['total']} notes for patient {patient_id} - "
            f"user_id: {current_user.id}"
        )

        return result

    except ValidationError as e:
        logger.error(
            f"Validation error getting notes - error: {str(e)}, "
            f"patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(
            f"Database error getting notes - error: {str(e)}, "
            f"patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve medical notes"
        )