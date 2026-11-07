"""Medical events API endpoints for MedicusUser.

This module provides endpoints for patient medical events viewing.

Uses the medical_events_view materialized view which combines:
- medical_visits (appointments)
- medical_examinations (completed exams)
- medical_exam_orders (scheduled exams)

Provides read-only access for patients to view their medical event timeline.
UI handles filtering into upcoming/past events.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from medicus_common.models.medical.events import MedicalEventsResponse
from medicus_common.models.user import User
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import patient_reader
from src.services.medical.events_service import medical_events_service

router = APIRouter(prefix="/medical-events", tags=["Health Calendar"])


@router.get("/patients/{patient_id}", response_model=MedicalEventsResponse)
async def get_patient_events(
    patient_id: int,
    limit: int = Query(100, ge=1, le=500, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(patient_reader)
):
    """Get all medical events for a patient.

    Retrieves all medical events from medical_events_view including visits,
    examinations, and exam orders. Returns all events sorted by date (active first).
    UI handles filtering into upcoming/past categories.

    Args:
        patient_id: ID of the patient
        limit: Maximum number of results (1-500, default 100)
        offset: Number of results to skip for pagination
        current_user: Authenticated user making the request

    Returns:
        Dict containing:
        - medical_events: List of all event records with status field
        - total_count: Total number of events

    Raises:
        HTTPException: 400 for validation errors, 500 for server errors
    """
    try:
        events_data = await medical_events_service.get_medical_events(
            patient_id=patient_id,
            limit=limit,
            offset=offset
        )

        # Return structure matching MedicalEventsResponse Pydantic model
        response = {
            "patient_id": patient_id,
            "events": events_data,
            "total": len(events_data),
            "limit": limit,
            "offset": offset
        }

        return response

    except ValidationError as e:
        logger.error(
            f"Validation error getting medical events - error: {str(e)}, "
            f"patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(
            f"Database error getting medical events - error: {str(e)}, "
            f"patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve medical events"
        )
