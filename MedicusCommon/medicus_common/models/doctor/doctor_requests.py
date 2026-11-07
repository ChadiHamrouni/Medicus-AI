# src/models/doctor_core.py
"""Doctor API Models for MedicusRegistry."""

from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from medicus_common.models.common import Address, WorkingHours, Location, WorkingHours, Certification

    
class DoctorRegistrationStep1Request(BaseModel):
    """Step 1: Choose authentication method (handled by auth service)."""
    # This is just the choice of method, actual auth data goes to AuthRegistrationRequest
    auth_method: str = Field(..., description="phone, email, or google")


class DoctorRegistrationStep2Request(BaseModel):
    """Step 2: Doctor-specific domain data (goes to doctors table)."""
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    country: str = Field(..., min_length=2, max_length=100)
    specialty: str = Field(..., min_length=2, max_length=100)
    license_number: str = Field(..., min_length=1, max_length=50)
    years_of_experience: Optional[int] = Field(None, ge=0, le=70)
    medical_school: Optional[str] = None
    board_certifications: Optional[List[str]] = None


class DoctorRegistrationRequest(BaseModel):
    """Combined doctor registration request."""
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    country: str = Field(..., min_length=2, max_length=100)
    specialty: str = Field(..., min_length=2, max_length=100)
    license_number: str = Field(..., min_length=1, max_length=50)
    years_of_experience: Optional[int] = Field(None, ge=0, le=70)
    medical_school: Optional[str] = None
    board_certifications: Optional[List[str]] = None
    terms_accepted: bool = Field(..., description="Terms acceptance")


class ProfessionalInfoRequest(BaseModel):
    """Professional information request for doctors."""
    specialty: str = Field(..., description="Medical specialty")
    sub_specialty: Optional[str] = Field(None, description="Sub-specialty")
    license_number: str = Field(..., description="Medical license number")
    license_state: str = Field(..., description="State where license was issued")
    license_expiry: str = Field(..., description="License expiry date (YYYY-MM-DD)")
    board_certifications: List[str] = Field(default_factory=list, description="Board certifications")
    medical_school: str = Field(..., description="Medical school")
    graduation_year: int = Field(..., ge=1950, le=2030, description="Graduation year")
    residency_program: Optional[str] = Field(None, description="Residency program")
    fellowship_program: Optional[str] = Field(None, description="Fellowship program")
    years_experience: int = Field(..., ge=0, le=60, description="Years of experience")
    languages_spoken: List[str] = Field(default_factory=list, description="Languages spoken")
    
class ProfessionalInfoUpdateRequest(BaseModel):
    """Request model for updating doctor's professional information."""
    other_specialties: Optional[list[int]] = None
    practising_since: Optional[int] = None
    medical_school: Optional[str] = None
    graduation_year: Optional[int] = None
    certifications: Optional[list[Certification]] = None
    professional_affiliations: Optional[list[str]] = None
    residency_program: Optional[str] = None
    residency_year: Optional[int] = None
    
    
class PracticeInfoRequest(BaseModel):
    """Practice information request for doctors."""
    practice_name: str = Field(..., min_length=2, description="Practice name")
    practice_type: str = Field(..., description="Type of practice")
    practice_address: Address = Field(..., description="Practice address")
    practice_phone: str = Field(..., description="Practice phone number")
    practice_email: Optional[EmailStr] = Field(None, description="Practice email")
    practice_website: Optional[str] = Field(None, description="Practice website")
    accepts_new_patients: bool = Field(default=True, description="Accepts new patients")
    telehealth_available: bool = Field(default=False, description="Telehealth available")
    emergency_contact: Optional[str] = Field(None, description="Emergency contact")
    additional_locations: List[Location] = Field(default_factory=list, description="Additional locations")


class WorkingHoursRequest(BaseModel):
    """Working hours request for doctors."""
    working_hours: List[WorkingHours] = Field(..., description="Weekly working hours")
    appointment_duration: int = Field(default=30, ge=15, le=120, description="Default appointment duration (minutes)")
    buffer_time: int = Field(default=15, ge=0, le=60, description="Buffer time between appointments (minutes)")
    lunch_break_start: Optional[str] = Field(None, description="Lunch break start time")
    lunch_break_end: Optional[str] = Field(None, description="Lunch break end time")
    vacation_mode: bool = Field(default=False, description="Vacation mode enabled")
    vacation_start: Optional[str] = Field(None, description="Vacation start date")
    vacation_end: Optional[str] = Field(None, description="Vacation end date")


class DoctorUpdateRequest(BaseModel):
    """Doctor profile update request."""
    # Basic info updates
    full_name: Optional[str] = Field(None, min_length=2, description="Full name")
    email: Optional[EmailStr] = Field(None, description="Email address")
    
    # Professional updates
    specialty: Optional[str] = Field(None, description="Primary specialty")
    sub_specialty: Optional[str] = Field(None, description="Sub-specialty")
    years_experience: Optional[int] = Field(None, ge=0, le=60, description="Years experience")
    languages_spoken: Optional[List[str]] = Field(None, description="Languages spoken")
    
    # Practice updates
    practice_name: Optional[str] = Field(None, description="Practice name")
    practice_phone: Optional[str] = Field(None, description="Practice phone")
    practice_email: Optional[EmailStr] = Field(None, description="Practice email")
    practice_website: Optional[str] = Field(None, description="Practice website")
    accepts_new_patients: Optional[bool] = Field(None, description="Accepts new patients")
    telehealth_available: Optional[bool] = Field(None, description="Telehealth available")
    
    # Additional profile fields
    about: Optional[str] = Field(None, description="About section")
    bio: Optional[str] = Field(None, description="Biography")
    education: Optional[List[str]] = Field(None, description="Education background")
    experience: Optional[List[str]] = Field(None, description="Work experience")
    awards: Optional[List[str]] = Field(None, description="Awards and recognitions")
    publications: Optional[List[str]] = Field(None, description="Publications")
    social_links: Optional[dict] = Field(None, description="Social media links")
    professional_links: Optional[dict] = Field(None, description="Professional links")
    insurance_accepted: Optional[List[str]] = Field(None, description="Insurance accepted")
    profile_image_url: Optional[str] = Field(None, description="Profile image URL")


class DoctorSearchRequest(BaseModel):
    """Doctor search request."""
    specialty: Optional[str] = Field(None, description="Specialty filter")
    location: Optional[str] = Field(None, description="Location filter")
    accepts_new_patients: Optional[bool] = Field(None, description="Accepts new patients filter")
    telehealth_available: Optional[bool] = Field(None, description="Telehealth filter")
    languages: Optional[List[str]] = Field(None, description="Languages filter")
    radius_km: Optional[int] = Field(None, ge=1, le=100, description="Search radius in kilometers")
    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")


