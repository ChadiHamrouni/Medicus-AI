# src/models/doctor_core.py
"""Doctor API Models for MedicusRegistry."""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from medicus_common.models.common import PhoneNumberField, EmailField


class DoctorContact(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    professional_email: Optional[str] = None
    professional_phone: Optional[str] = None
    office_phone: Optional[str] = None
    fax_number: Optional[str] = None
    website_url: Optional[str] = None
    profile_picture_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    model_config = {
        'extra': 'ignore'
    }
    
class DoctorMetadata(BaseModel):
    google_calendar_id: Optional[str] = None
    notes: Optional[str] = None

    
class DoctorProfilePracticeInfo(BaseModel):
    """Request model for updating doctor's practice information."""
    prefix: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language_id: Optional[int] = None
    medical_licence: Optional[str] = None
    wa_number: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


class DoctorProfileTimeSlot(BaseModel):
    """Time slot model for working hours."""
    start_time: Optional[str] = None  # Start time of the slot
    end_time: Optional[str] = None  # End time of the slot
    other_locations_id: Optional[int] = None  # ID of the other location if applicable

class DoctorProfileWorkingHours(BaseModel):
    """Working hours model for doctor profile."""
    day_of_week: Optional[str] = None  # Day of the week
    is_available: Optional[bool] = None  # Availability status
    time_slots: Optional[List[DoctorProfileTimeSlot]] = []  # List of working hours time slots


class DoctorProfileAdditionalInformation(BaseModel):
    """Doctor profile additional information model."""
    about_you: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    contact_working_phone: Optional[str] = None
    contact_cell_phone: Optional[str] = None

class DoctorProfileAdditionalLink(BaseModel):
    """Doctor profile additional link model."""
    website_name: str
    website_url: str

class DoctorProfileAdditionalLinks(BaseModel):
    """Doctor profile additional links model."""
    additional_links: List[DoctorProfileAdditionalLink] = []
    

class DoctorProfileLocation(BaseModel):
    """Doctor profile location model."""
    id: Optional[int] = None  # Unique identifier for the location
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    is_primary: Optional[bool] = False
    location_name: Optional[str] = None
    

    
