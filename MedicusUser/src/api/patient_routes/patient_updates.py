"""Patient management API endpoints for MedicusUser.

This module provides endpoints for direct patient management, complementing
the dependent management functionality. These endpoints handle:
- Patient search and lookup
- Insurance management for patients
- Patient profile operations

Migrated from MedicusRegistry to consolidate patient management functionality.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body

# Import models from medicus-common
from medicus_common.models.patient import (
    PatientResponse,
    PatientProfileUpdateRequest
)
from medicus_common.models.user import User
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import patient_owner

# Import services
from src.services.patient.patient_service import patient_service

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.put("/{patient_id}/medical-data", response_model=dict)
async def update_patient_medical_data(
    patient_id: int,
    medical_data: dict,
    current_user: User = Depends(patient_owner)
) -> dict:
    """Update patient medical data.
    
    Updates the medical_data JSON field with health conditions, allergies,
    medical history, and lifestyle information.
    
    Args:
        patient_id: ID of the patient to update
        medical_data: Medical data dictionary with fields like chronic_conditions, allergies, etc.
        current_user: Authenticated user making the request
        
    Returns:
        dict: Success message with updated data
        
    Raises:
        HTTPException: 404 if patient not found, 422 for validation errors, 500 for server errors
    """
    logger.info(f"Updating medical data - patient_id: {patient_id}, user_id: {current_user.id}")

    try:
        import json
        from datetime import datetime

        # Validate patient exists
        patient = await patient_service.get_patient_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Update medical data
        await patient_service.db_manager.execute(
            "UPDATE public.patients SET medical_data = $1, updated_at = $2 WHERE id = $3",
            json.dumps(medical_data),
            datetime.utcnow(),
            patient_id
        )

        logger.info(f"Medical data updated successfully - patient_id: {patient_id}, user_id: {current_user.id}")
        
        return {
            "success": True,
            "message": "Medical data updated successfully",
            "data": medical_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating medical data - error: {str(e)}, patient_id: {patient_id}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update medical data"
        )


@router.put("/{patient_id}/emergency-contact", response_model=dict)
async def update_patient_emergency_contact(
    patient_id: int,
    emergency_contact: List[dict],
    current_user: User = Depends(patient_owner)
) -> dict:
    """Update patient emergency contact information.
    
    Updates the emergency_contact JSON field with primary and alternate
    emergency contact details.
    
    Args:
        patient_id: ID of the patient to update
        emergency_contact: Emergency contact dictionary with primary_contact and alternate_contact
        current_user: Authenticated user making the request
        
    Returns:
        dict: Success message with updated data
        
    Raises:
        HTTPException: 404 if patient not found, 422 for validation errors, 500 for server errors
    """
    logger.info(f"Updating emergency contact - patient_id: {patient_id}, user_id: {current_user.id}")
    
    try:
        import json
        from datetime import datetime
        
        # Validate patient exists
        patient = await patient_service.get_patient_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Update emergency contact
        await patient_service.db_manager.execute(
            "UPDATE public.patients SET emergency_contact = $1, updated_at = $2 WHERE id = $3",
            json.dumps(emergency_contact),
            datetime.utcnow(),
            patient_id
        )

        logger.info(f"Emergency contact updated successfully - patient_id: {patient_id}, user_id: {current_user.id}")
        
        return {
            "success": True,
            "message": "Emergency contact updated successfully",
            "data": emergency_contact
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating emergency contact - error: {str(e)}, patient_id: {patient_id}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update emergency contact"
        )


@router.put("/{patient_id}/metadata", response_model=dict)
async def update_patient_metadata(
    patient_id: int,
    metadata: dict,
    current_user: User = Depends(patient_owner)
) -> dict:
    """Update patient metadata (profile information).
    
    Updates the metadata JSON field with profile information like
    marital status, occupation, preferred hospital, etc.
    
    Args:
        patient_id: ID of the patient to update
        metadata: Metadata dictionary with profile fields
        current_user: Authenticated user making the request
        
    Returns:
        dict: Success message with updated data
        
    Raises:
        HTTPException: 404 if patient not found, 422 for validation errors, 500 for server errors
    """
    logger.info(f"Updating metadata - patient_id: {patient_id}, user_id: {current_user.id}")
    
    try:
        import json
        from datetime import datetime
        
        # Validate patient exists
        patient = await patient_service.get_patient_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Update metadata
        await patient_service.db_manager.execute(
            "UPDATE public.patients SET metadata = $1, updated_at = $2 WHERE id = $3",
            json.dumps(metadata),
            datetime.utcnow(),
            patient_id
        )
        
        logger.info(f"Metadata updated successfully - patient_id: {patient_id}, user_id: {current_user.id}")
        
        return {
            "success": True,
            "message": "Patient metadata updated successfully",
            "data": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating metadata - error: {str(e)}, patient_id: {patient_id}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update metadata"
        )


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    update_data: PatientProfileUpdateRequest,
    current_user: User = Depends(patient_owner)
) -> PatientResponse:
    """Update patient information.

    Updates patient profile information including personal details,
    contact information, medical data, and insurance coverage.

    Args:
        patient_id: ID of the patient to update
        update_data: Patient update data
        current_user: Authenticated user making the request

    Returns:
        PatientResponse: Updated patient data

    Raises:
        HTTPException: 404 if patient not found, 422 for validation errors, 500 for server errors
    """
    logger.info(f"Updating patient - patient_id: {patient_id}, user_id: {current_user.id}")

    try:
        patient = await patient_service.update_patient(patient_id, update_data)
        
        logger.info(f"Patient updated successfully - patient_id: {patient_id}, user_id: {current_user.id}")
        return patient
        
    except ValidationError as e:
        logger.error(f"Validation error updating patient - error: {str(e)}, patient_id: {patient_id}, user_id: {current_user.id}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except DatabaseError as e:
        logger.error(f"Database error updating patient - error: {str(e)}, patient_id: {patient_id}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update patient"
        )
    except Exception as e:
        logger.error(f"Unexpected error updating patient - error: {str(e)}, patient_id: {patient_id}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )



