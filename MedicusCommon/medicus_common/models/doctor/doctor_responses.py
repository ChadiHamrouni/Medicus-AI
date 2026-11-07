# src/models/doctor_core.py
"""Doctor API Models for MedicusRegistry."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from medicus_common.models.base import BaseResponseModel
from medicus_common.models.common import Address, WorkingHours
from medicus_common.models.doctor.doctor_core import DoctorStatus


class DoctorRegistrationResponse(BaseModel):
    """Response for doctor registration."""
    doctor_id: int
    user_id: int
    first_name: str
    last_name: str
    country: str
    specialty: str
    license_number: str
    status: DoctorStatus
    verification_required: bool  # True if email/SMS verification needed
    verification_method: str  # "email" or "sms"
    license_verification_pending: bool = True  # Always true initially



class DoctorResponse(BaseResponseModel):
    """Doctor response model."""
    id: int = Field(..., description="Doctor ID")
    user_id: int = Field(..., description="User ID")
    full_name: str = Field(..., description="Full name")
    specialty: Optional[str] = Field(None, description="Primary specialty")
    avatar_url: Optional[str] = Field(None, description="photo or avatar")
    gender: Optional[str] = Field(..., description="doctor gender")
    whatsapp_number: str = Field(..., description="WhatsApp number")
    email: str = Field(..., description="Email address")
    license_number: Optional[str] = Field(None, description="License number")
    practice_name: Optional[str] = Field(None, description="Practice name")
    signup_step: int = Field(..., description="Current signup step")
    is_verified: bool = Field(default=False, description="Profile verification status")
    is_active: bool = Field(default=True, description="Active status")
    created_at: datetime = Field(..., description="Creation timestamp")


class DoctorProfileResponse(BaseResponseModel):
    """Comprehensive doctor profile response."""
    # Basic info
    id: int = Field(..., description="Doctor ID")
    user_id: int = Field(..., description="User ID")
    whatsapp_number: str = Field(..., description="WhatsApp number")
    email: Optional[str] = Field(None, description="Email address")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    full_name: str = Field(..., description="Full name")
    
    # Professional info
    specialty: Optional[str] = Field(None, description="Primary specialty")
    sub_specialty: Optional[str] = Field(None, description="Sub-specialty")
    license_number: Optional[str] = Field(None, description="License number")
    license_state: Optional[str] = Field(None, description="License state")
    license_expiry: Optional[str] = Field(None, description="License expiry")
    board_certifications: List[str] = Field(default_factory=list, description="Certifications")
    medical_school: Optional[str] = Field(None, description="Medical school")
    graduation_year: Optional[int] = Field(None, description="Graduation year")
    years_experience: Optional[int] = Field(None, description="Years experience")
    languages_spoken: List[str] = Field(default_factory=list, description="Languages")
    
    # Practice info
    practice_name: Optional[str] = Field(None, description="Practice name")
    practice_type: Optional[str] = Field(None, description="Practice type")
    practice_address: Optional[Address] = Field(None, description="Practice address")
    practice_phone: Optional[str] = Field(None, description="Practice phone")
    practice_email: Optional[str] = Field(None, description="Practice email")
    practice_website: Optional[str] = Field(None, description="Practice website")
    accepts_new_patients: bool = Field(default=True, description="Accepts new patients")
    telehealth_available: bool = Field(default=False, description="Telehealth available")
    
    # Working hours
    working_hours: List[WorkingHours] = Field(default_factory=list, description="Working hours")
    appointment_duration: Optional[int] = Field(None, description="Appointment duration")
    
    # Status
    signup_step: int = Field(..., description="Signup step")
    is_verified: bool = Field(default=False, description="Verification status")
    is_active: bool = Field(default=True, description="Active status")
    verification_documents_submitted: bool = Field(default=False, description="Documents submitted")
    
    # Metadata
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    
    
class ExtendedDoctorProfileResponse(DoctorProfileResponse):
    """Extended doctor profile response model with additional fields."""
    prefix: Optional[str] = None  # Title or prefix
    first_name: Optional[str] = None  # Doctor's first name 
    last_name: Optional[str] = None  # Doctor's last name
    other_specialties: Optional[List[int]] = []  # Additional specialty IDs
    practising_since: Optional[int] = None  # Year started practicing
    medical_school_metadata: Optional[str] = None  # Medical school from metadata
    graduation_year_metadata: Optional[int] = None  # Graduation year from metadata
    residency_program: Optional[str] = None  # Residency program
    residency_year: Optional[int] = None  # Residency completion year
    professional_affiliations: Optional[List[str]] = []  # Professional affiliations
    certifications: Optional[List[dict]] = []  # Medical certifications
    other_locations: Optional[List[dict]] = []  # Other practice locations
    working_hours: Optional[List[dict]] = []  # Working hours schedule
    medical_procedures: Optional[dict] = {}  # Medical procedures and additional info
    about_you: Optional[str] = None  # About you from metadata
    gender: Optional[str] = None  # Gender field
    dob: Optional[str] = None  # Date of birth from metadata
    contact_working_phone: Optional[str] = None  # Working phone from contact
    contact_cell_phone: Optional[str] = None  # Cell phone from contact
    fax_number: Optional[str] = None  # Fax number from contact
    additional_links: Optional[List[dict]] = []  # Additional links from metadata
    raw_address: Optional[dict] = None  # Raw address from database
    language_id: Optional[int] = None  # Language ID from metadata
    

class DoctorListResponse(BaseResponseModel):
    """Doctor list response with pagination."""
    doctors: List[DoctorResponse] = Field(..., description="List of doctors")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    limit: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")
    
