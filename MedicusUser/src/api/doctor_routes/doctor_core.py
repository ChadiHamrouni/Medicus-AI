
        
        
# =============================================================================
# src/api/doctor_core.py
"""Doctor profile management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import date

from medicus_common.models.user import UserRole
from medicus_common.models.doctor import (
    DoctorSearchResponse
)
from medicus_common.models.doctor.doctor_view import DoctorView
from medicus_common.models.doctor.doctor_events import DoctorEventsResponse
from medicus_common.services.doctors_service import DoctorsService
from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import doctor_self
from src.services.doctor.doctor_service import DoctorService
from src.services.doctor.doctor_events_service import DoctorEventsService

router = APIRouter(prefix="/doctor", tags=["doctor-profile"])


@router.get("/search", response_model=DoctorSearchResponse)
async def search_doctors(
    country_id: Optional[int] = Query(None),
    super_category_id: Optional[int] = Query(None),
    specialty_id: Optional[int] = Query(None),
    query: Optional[str] = Query(None, description="Search query for doctor name"),
    doctor_name: Optional[str] = Query(None, description="Legacy parameter for doctor name"),
    include_out_of_network: bool = Query(True),
    search_foreign_country: Optional[int] = Query(None),
    exclude_doctor_id: Optional[int] = Query(None, description="Exclude this doctor from results (for doctor users)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    current_user: dict = Depends(get_current_user),
) -> DoctorSearchResponse:
    """
    Doctor search endpoint with pagination and filtering using DoctorsService.
    """
    try:
        # Normalize search parameters - support both 'query' and 'doctor_name'
        search_name = query or doctor_name

        # For local search, use the user's country_id unless doing international search
        user_country_id = current_user.country_id if hasattr(current_user, 'country_id') else None
        search_country_id = country_id or (user_country_id if not search_foreign_country else None)

        # Use DoctorsService for lightweight doctor search
        result = await DoctorsService.get_doctors(
            country_id=search_country_id,
            category_id=super_category_id,
            specialty_id=specialty_id,
            name=search_name,
            in_out_network=include_out_of_network,
            page=page,
            page_size=page_size,
            search_foreign_country=search_foreign_country,
            exclude_doctor_id=exclude_doctor_id  # NEW
        )

        return result

    except Exception as e:
        logger.error(f"Failed to search doctors: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while searching for doctors")


@router.get("/search/oon", response_model=DoctorSearchResponse)
async def search_oon_doctors(
    country_id: Optional[int] = Query(None),
    super_category_id: Optional[int] = Query(None),
    specialty_id: Optional[int] = Query(None),
    query: Optional[str] = Query(None, description="Search query for doctor name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    current_user: dict = Depends(get_current_user),
) -> DoctorSearchResponse:
    """
    Search out-of-network doctors from doctors_oon_view.
    Used when patient toggles "include out of network" in discovery page.
    """
    try:
        # Get user's country if not specified
        user_country_id = current_user.country_id if hasattr(current_user, 'country_id') else None
        search_country_id = country_id or user_country_id

        # Use DoctorsService to get OON doctors
        result = await DoctorsService.get_oon_doctors(
            country_id=search_country_id,
            specialty_id=specialty_id,
            category_id=super_category_id,
            name=query,
            page=page,
            page_size=page_size
        )

        # Transform to match DoctorSearchResponse format
        return {
            "doctors": result["doctors"],
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"],
            "in_network_count": 0,  # All OON
            "out_of_network_count": result["total"]
        }

    except Exception as e:
        logger.error(f"Failed to search OON doctors: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while searching for out-of-network doctors")


# =============================================================================
# Doctor Detail Data Endpoints
# =============================================================================

@router.get("/profile")
async def get_doctor_profile(current_user = Depends(get_current_user)):
    """Get doctor's complete profile information."""
    try:
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )

        # Get full doctor details for profile page (not login light data)
        from src.services.doctor.helpers import get_doctor_details
        profile = await get_doctor_details(current_user.id)

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )

        return profile

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get doctor profile for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve doctor profile"
        )


@router.get("/{doctor_id}", response_model=DoctorView)
async def get_doctor_by_id(
    doctor_id: int,
    current_user = Depends(get_current_user)
):
    """Get doctor profile by doctor ID."""
    try:
        profile = await DoctorService.get_doctor_by_id(doctor_id)

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )

        return profile

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get doctor by ID {doctor_id} for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve doctor profile"
        )


@router.get("/{doctor_id}/public-profile")
async def get_doctor_public_profile(
    doctor_id: int,
    current_user = Depends(get_current_user)
):
    """
    Get detailed doctor profile by doctor ID for public viewing.
    Used when a patient views a doctor's profile from a conversation.
    Includes working hours, certifications, procedures, contact info, etc.
    """
    try:
        profile = await DoctorService.get_doctor_public_profile(doctor_id)

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )

        return profile

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get doctor public profile for ID {doctor_id} by user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve doctor profile"
        )


@router.get("/{doctor_id}/events", response_model=DoctorEventsResponse)
async def get_doctor_events(
    doctor_id: int,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: 'active' or 'past'"),
    date_from: Optional[date] = Query(None, description="Filter events from this date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter events to this date (YYYY-MM-DD)"),
    patient_id: Optional[int] = Query(None, description="Filter by specific patient"),
    current_user = Depends(doctor_self)
):
    """Get the calling doctor's calendar events (visits and procedures)."""
    try:
        result = await DoctorEventsService.get_doctor_events(
            doctor_id=doctor_id,
            limit=limit,
            offset=offset,
            status_filter=status_filter,
            date_from=date_from,
            date_to=date_to,
            patient_id=patient_id
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get events for doctor {doctor_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve doctor events"
        )

