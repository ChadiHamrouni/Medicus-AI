"""Patient management API endpoints for MedicusUser.

This module provides endpoints for direct patient management, complementing
the dependent management functionality. These endpoints handle:
- Patient search and lookup
- Insurance management for patients
- Patient profile operations

Migrated from MedicusRegistry to consolidate patient management functionality.
"""

from fastapi import APIRouter, Depends, HTTPException, status

# Import models from medicus-common
from medicus_common.models.patient import (
    PatientResponse,
)
from medicus_common.models.user import User
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import admin_only, is_admin, patient_reader

# Import services
from src.services.patient.patient_service import patient_service

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/by-phone/{phone_number}", response_model=PatientResponse)
async def get_patient_by_phone(
    phone_number: str,
    current_user: User = Depends(admin_only)
):
    """Find patient by phone number.
    
    Searches for a patient record using their phone number.
    Useful for patient lookup during registration or verification.
    
    Args:
        phone_number: Patient's phone number
        current_user: Authenticated user making the request
        
    Returns:
        PatientResponse: Patient details if found
        
    Raises:
        HTTPException: 404 if patient not found, 500 for server errors
    """
    logger.info(
        f"Searching patient by phone - user_id: {current_user.id}, phone_number: {phone_number}"
    )
    
    try:
        patient = await patient_service.get_patient_by_phone(phone_number)
        
        if not patient:
            logger.warning(
                f"Patient not found by phone - phone_number: {phone_number}, user_id: {current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found with this phone number"
            )
        
        logger.info(
            f"Patient found by phone - patient_id: {patient.id}, phone_number: {phone_number}, user_id: {current_user.id}"
        )
        
        return patient
        
    except ValidationError as e:
        logger.error(
            f"Validation error in patient phone lookup - error: {str(e)}, phone_number: {phone_number}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(
            f"Database error in patient phone lookup - error: {str(e)}, phone_number: {phone_number}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search patient by phone"
        )


@router.get("/by-user/{user_id}", response_model=PatientResponse)
async def get_patient_by_user_id(
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    """Find patient by user ID.
    
    Retrieves the patient record associated with a specific user account.
    Useful for getting patient information when you have the user ID from
    the authentication system.
    
    Args:
        user_id: User ID from the auth system
        current_user: Authenticated user making the request
        
    Returns:
        PatientResponse: Patient details if found
        
    Raises:
        HTTPException: 404 if patient not found, 400 for validation errors, 500 for server errors
    """
    if user_id != current_user.id and not is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found for this user")

    try:
        logger.info(
            f"Patient lookup by user ID - user_id: {user_id}, requester: {current_user.id}"
        )

        patient = await patient_service.get_patient_by_user_id(user_id)
        
        if not patient:
            logger.warning(
                f"Patient not found by user ID - user_id: {user_id}, requester: {current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found for this user"
            )
        
        logger.info(
            f"Patient found by user ID - patient_id: {patient.id}, user_id: {user_id}, requester: {current_user.id}"
        )
        
        return patient
        
    except ValidationError as e:
        logger.error(
            f"Validation error in patient user lookup - error: {str(e)}, user_id: {user_id}, requester: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(
            f"Database error in patient user lookup - error: {str(e)}, user_id: {user_id}, requester: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search patient by user ID"
        )


@router.get("/me", response_model=PatientResponse)
async def get_my_patient_record(
    current_user: User = Depends(get_current_user)
):
    """Get the patient record for the current user.
    
    Retrieves the patient record associated with the currently authenticated user.
    This is a convenience endpoint that automatically uses the current user's ID.
    
    Args:
        current_user: Authenticated user making the request
        
    Returns:
        PatientResponse: Current user's patient details
        
    Raises:
        HTTPException: 404 if patient not found, 500 for server errors
    """
    try:
        logger.info(
            f"Current user patient lookup - user_id: {current_user.id}"
        )
        
        patient = await patient_service.get_patient_by_user_id(current_user.id)
        
        if not patient:
            logger.warning(
                f"Patient record not found for current user - user_id: {current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No patient record found for current user"
            )
        
        logger.info(
            f"Current user patient found - patient_id: {patient.id}, user_id: {current_user.id}"
        )
        
        return patient
        
    except DatabaseError as e:
        logger.error(
            f"Database error in current user patient lookup - error: {str(e)}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve patient record"
        )


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient_by_id(
    patient_id: int,
    current_user: User = Depends(patient_reader)
):
    """Get patient details by ID.
    
    Retrieves complete patient information including profile data
    and insurance coverage if available.
    
    Args:
        patient_id: ID of the patient
        current_user: Authenticated user making the request
        
    Returns:
        PatientResponse: Complete patient details
        
    Raises:
        HTTPException: 404 if patient not found, 500 for server errors
    """
    logger.info(
        f"Retrieving patient by ID - user_id: {current_user.id}, patient_id: {patient_id}"
    )
    
    try:
        patient = await patient_service.get_patient_by_id(patient_id)
        
        if not patient:
            logger.warning(
                f"Patient not found by ID - patient_id: {patient_id}, user_id: {current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        logger.info(
            f"Patient retrieved successfully - patient_id: {patient_id}, user_id: {current_user.id}"
        )
        
        return patient
        
    except DatabaseError as e:
        logger.error(
            f"Database error retrieving patient - error: {str(e)}, patient_id: {patient_id}, user_id: {current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve patient"
        )

