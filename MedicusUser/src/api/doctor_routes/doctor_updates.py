# src/api/doctor_routes/doctor_updates.py
"""Doctor profile management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from medicus_common.core.exceptions import ValidationError
from medicus_common.models.user import UserRole
from medicus_common.models.common import ContactInfo, MedicalProceduresRequest
from medicus_common.models.doctor import (
    DoctorProfileWorkingHours,
    DoctorProfilePracticeInfo,
    ProfessionalInfoUpdateRequest,
    DoctorProfileAdditionalInformation,
    DoctorProfileAdditionalLinks,
    DoctorProfileLocation
)

from medicus_common.core.logging_config import logger

from src.api.auth_routes.auth_login import get_current_user
from src.services.doctor.doctor_service import DoctorService
router = APIRouter(prefix="/doctor", tags=["doctor-profile"])

      
@router.put("/practice-info")
async def update_practice_info(
    practice_data: DoctorProfilePracticeInfo,
    current_user = Depends(get_current_user)
):
    """Update doctor's practice information."""
    try:
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
        
        # Convert the practice data and handle address fields
        practice_dict = practice_data.model_dump(exclude_unset=True)
        logger.info(f"Practice data received for user {current_user.id}: {practice_dict}")
        
        # Extract address fields and convert to address object
        address_fields = ['address_line_1', 'address_line_2', 'city', 'state', 'zip_code']
        address_data = {}
        
        # Check if any address fields are provided
        has_address_data = any(field in practice_dict for field in address_fields)
        
        if has_address_data:
            # Extract address fields from practice_dict
            for field in address_fields:
                if field in practice_dict:
                    address_data[field] = practice_dict.pop(field)  # Remove from practice_dict
            
            # Add the address object to practice_dict
            practice_dict['address'] = address_data
            
        doctor_profile_service = DoctorService()
        updated_profile = await doctor_profile_service.update_practice_info(
            current_user.id, practice_dict
        )
        
        return updated_profile
        
    except ValidationError as e:
        logger.error(f"Validation error in practice info update for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update practice info for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update practice information"
        )


@router.put("/working-hours")
async def update_working_hours(
    working_hours_data: List[DoctorProfileWorkingHours],
    current_user = Depends(get_current_user)
):
    """Update doctor's working hours."""
    try:
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
            
        # Create a simple object that has model_dump() method
        class WorkingHoursData:
            def __init__(self, data):
                self.data = data
            
            def model_dump(self):
                return self.data
        
        # Convert the list of working hours to the format expected by the service
        working_hours_dict = [wh.model_dump() for wh in working_hours_data]
        
        # Create the wrapper object
        working_hours_request = WorkingHoursData(working_hours_dict)
        
        doctor_profile_service = DoctorService()
        updated_hours = await doctor_profile_service.update_working_hours(
            current_user.id, working_hours_request
        )
        
        return updated_hours
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update working hours for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update working hours"
        )


@router.put("/procedures")
async def update_medical_procedures(
    procedures_data: MedicalProceduresRequest,
    current_user = Depends(get_current_user)
):
    """Update doctor's medical procedures and fees."""
    try:
        logger.info(f"PROCEDURES: Raw input received - Type: {type(procedures_data)}, Data: {procedures_data}")
        logger.info(f"PROCEDURES: Model dump - {procedures_data.model_dump(exclude_unset=True)}")
        
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
        
        
        # Convert the new MedicalProceduresRequest to the format expected by the service
        # The service expects a dict with 'medical_procedures' key containing the procedure details
        procedures_dict = {
            'medical_procedures': [
                {
                    'procedure_name': proc.procedure_name,
                    'price': float(proc.procedure_price) if proc.procedure_price.replace('.', '').isdigit() else 0,
                }
                for proc in procedures_data.medical_procedures
            ],
            'currency': procedures_data.currency,
            'consultation_types': procedures_data.consultation_types or [],
            'insurance_accepted': procedures_data.insurance_accepted or []
        }
        
        doctor_profile_service = DoctorService()
        updated_procedures = await doctor_profile_service.update_medical_procedures(
            current_user.id, procedures_dict
        )
        
        # Return the same MedicalProceduresRequest model format that was input
        return procedures_data
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update procedures for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update medical procedures"
        )


@router.put("/contact-info")
async def update_contact_info(
    contact_data: ContactInfo,
    current_user = Depends(get_current_user)
):
    """Update doctor's contact information."""
    try:
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
        
        doctor_profile_service = DoctorService()
        updated_contact = await doctor_profile_service.update_contact_info(
            current_user.id, contact_data.model_dump()
        )
        
        return updated_contact
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update contact info for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update contact information"
        )


@router.put("/locations")
async def update_locations(
    locations_data: List[DoctorProfileLocation],
    current_user = Depends(get_current_user)
):
    """Update doctor's address and other locations."""
    try:
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
        
        # Get existing locations to determine next available ID
        profile = await DoctorService.get_connected_doctor(current_user.id)
        existing_locations = profile.get('other_locations', []) if profile else []
        
        # Find the highest existing ID to generate new ones
        max_id = 0
        if existing_locations:
            for loc in existing_locations:
                if loc.get('id') and loc['id'] > max_id:
                    max_id = loc['id']
        
        # Convert locations to the expected format for the service
        primary_address = None
        other_locations = []
        
        for loc in locations_data:
            loc_dict = loc.model_dump()
            
            # Generate ID if not provided
            location_id = loc_dict.get('id')
            if location_id is None:
                max_id += 1
                location_id = max_id
     
            other_location = {
                'id': location_id,  # Ensure every location has an ID
                'location_name': loc_dict.get('location_name', 'Additional Location'),
                'address_line_1': loc_dict.get('address_line_1', ''),
                'address_line_2': loc_dict.get('address_line_2', ''),
                'city': loc_dict.get('city', ''),
                'state': loc_dict.get('state', ''),
                'zip_code': loc_dict.get('zip_code', ''),
                'is_primary': loc_dict.get('is_primary', False)
            }
            other_locations.append(other_location)
        
        doctor_profile_service = DoctorService()
        updated_locations = await doctor_profile_service.update_locations(
            current_user.id, other_locations
        )
        
        # Convert response back to DoctorProfileLocation format
        response_locations = []
        
        
        # Add other locations
        for other_loc in updated_locations.get('other_locations', []):
            location = {
                'id': other_loc.get('id'),  # Include the location ID
                'address_line_1': other_loc.get('address_line_1', ''),
                'address_line_2': other_loc.get('address_line_2', ''),
                'city': other_loc.get('city', ''),
                'state': other_loc.get('state', ''),
                'zip_code': other_loc.get('zip_code', ''),
                'is_primary': False,
                'location_name': other_loc.get('location_name', 'Additional Location')
            }
            response_locations.append(location)
        
        return response_locations
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update locations for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update location information"
        )


@router.put("/additional-info")
async def update_additional_info(
    additional_data: DoctorProfileAdditionalInformation,
    current_user = Depends(get_current_user)
):
    """Update doctor's additional information (about, gender, dob, contact phones)."""
    try:
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
    
        update_data = {
            'metadata_fields': {},
            'gender': additional_data.gender,
            'contact_fields': {}
        }
        
        # Add metadata fields (about_you + dob)
        if additional_data.about_you is not None:
            update_data['metadata_fields']['about_you'] = additional_data.about_you
        if additional_data.dob is not None:
            update_data['metadata_fields']['dob'] = additional_data.dob
            
        # Add contact fields (working_phone + cell_phone)
        if additional_data.contact_working_phone is not None:
            update_data['contact_fields']['contact_working_phone'] = additional_data.contact_working_phone
        if additional_data.contact_cell_phone is not None:
            update_data['contact_fields']['contact_cell_phone'] = additional_data.contact_cell_phone
        
        doctor_profile_service = DoctorService()
        updated_info = await doctor_profile_service.update_additional_info_structured(
            current_user.id, update_data
        )
        
        return updated_info
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update additional info for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update additional information"
        )


@router.put("/additional-links")
async def update_additional_links(
    links_data: DoctorProfileAdditionalLinks,
    current_user = Depends(get_current_user)
):
    """Update doctor's additional links (websites, social media, etc.)."""
    try:
        logger.info(f"ADDITIONAL_LINKS: Raw input received - Type: {type(links_data)}, Data: {links_data}")
        logger.info(f"ADDITIONAL_LINKS: Model dump - {links_data.model_dump(exclude_unset=True)}")
        
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
            
        # Convert links to the format for metadata storage
        links_list = [
            {
                'website_name': link.website_name,
                'website_url': link.website_url
            }
            for link in links_data.additional_links
        ]
        
        # Update metadata with additional_links
        update_data = {
            'metadata_fields': {
                'additional_links': links_list
            }
        }
        
        doctor_profile_service = DoctorService()
        updated_info = await doctor_profile_service.update_additional_info_structured(
            current_user.id, update_data
        )
        
        # Return just the additional_links from metadata
        metadata = updated_info.get('metadata', {})
        return {
            'additional_links': metadata.get('additional_links', [])
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update additional links for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update additional links"
        )


@router.put("/professional-info")
async def update_professional_info(
    professional_data: ProfessionalInfoUpdateRequest,
    current_user = Depends(get_current_user)
):
    """Update doctor's professional information (specialties, education, certifications, etc.)."""
    try:
        # Verify user is a doctor
        if current_user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can access this endpoint"
            )
        
        doctor_profile_service = DoctorService()
        updated_info = await doctor_profile_service.update_professional_info(
            current_user.id, professional_data.model_dump(exclude_unset=True)
        )
        
        # Parse certifications if it's a string (JSONB field from database)
        if 'certifications' in updated_info and isinstance(updated_info['certifications'], str):
            import json
            try:
                updated_info['certifications'] = json.loads(updated_info['certifications'])
            except (json.JSONDecodeError, TypeError):
                updated_info['certifications'] = []
        
        return updated_info
        
    except ValidationError as e:
        logger.error(f"Validation error in professional info update for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update professional info for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update professional information"
        )
