# medicus_common/models/patient_core.py
"""Patient domain models - for patients table (domain-specific data only)."""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from medicus_common.models.common import Address, Gender, EmergencyContact
from medicus_common.models.base import BaseResponseModel
from .patient_core import PatientStatus


class PatientRegistrationResponse(BaseModel):
    """Response for patient registration."""
    patient_id: int
    user_id: int
    country_id: int
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Gender
    status: PatientStatus
    verification_required: bool  # True if email/SMS verification needed
    verification_method: str  # "email" or "sms"


class PatientResponse(BaseResponseModel):
    """Patient response model."""
    id: int = Field(..., description="Patient ID")
    user_id: int = Field(..., description="User ID")
    country_id: int = Field(..., description="Country ID")
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = Field(None, description="Date of birth")
    gender: Optional[Gender] = Field(None, description="Gender")
    whatsapp_number: Optional[str] = Field(None, description="WhatsApp number")
    emergency_contact: Optional[List[EmergencyContact]] = Field(
        default_factory=list,
        description="List of emergency contact information"
    )
    address: Optional[Dict[str, str]] = Field(None, description="Address information")
    contact: Optional[Dict[str, str]] = Field(None, description="Contact information")
    medical_prescriptions: Optional[List[dict]] = Field(None, description="List of medical prescriptions")
    past_medical_visits: Optional[List[Dict[str, Any]]] = Field(None, description="Past medical visits from materialized view")    
    email: Optional[str] = Field(None, description="Email address")
    signup_step: int = Field(..., description="Current signup step")
    is_profile_complete: bool = Field(default=False, description="Profile completion status")
    is_active: bool = Field(default=True, description="Active status")
    created_at: datetime = Field(..., description="Creation timestamp")

    # Additional optional fields for complete patient profile (backward compatible)
    full_name: Optional[str] = Field(None, description="Full name")
    display_name: Optional[str] = Field(None, description="Display name")
    wa_number: Optional[str] = Field(None, description="WhatsApp number (legacy)")
    country_id: Optional[int] = Field(1, description="Country ID")
    language_id: Optional[int] = Field(None, description="Language ID")
    language_name: Optional[str] = Field(None, description="Language name")
    relationship: Optional[str] = Field(None, description="Relationship (main/dependent)")
    status: Optional[str] = Field(None, description="Patient status")
    metadata: Optional[dict] = Field(None, description="Additional metadata")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    dob: Optional[date] = Field(None, description="Date of birth (alias)")


class PatientProfileResponse(BaseResponseModel):
    """Comprehensive patient profile response."""
    # Basic info
    id: int = Field(..., description="Patient ID")
    user_id: int = Field(..., description="User ID")
    whatsapp_number: str = Field(..., description="WhatsApp number")
    email: str = Field(..., description="Email address")
    full_name: str = Field(..., description="Full name")

    # Personal info
    date_of_birth: Optional[str] = Field(None, description="Date of birth")
    age: Optional[int] = Field(None, description="Age (calculated)")
    gender: Optional[Gender] = Field(None, description="Gender")
    phone_number: Optional[str] = Field(None, description="Additional phone")
    country_id: Optional[int] = Field(None, description="Country ID")
    address: Optional[Address] = Field(None, description="Home address")
    preferred_language: str = Field(default="en", description="Preferred language")
    marital_status: Optional[str] = Field(None, description="Marital status")
    occupation: Optional[str] = Field(None, description="Occupation")
    
    # Medical history
    chronic_conditions: List[str] = Field(default_factory=list, description="Chronic conditions")
    current_medications: List[str] = Field(default_factory=list, description="Current medications")
    allergies: List[str] = Field(default_factory=list, description="Known allergies")
    previous_surgeries: List[str] = Field(default_factory=list, description="Previous surgeries")
    family_medical_history: List[str] = Field(default_factory=list, description="Family history")
    
    # Lifestyle
    smoking_status: Optional[str] = Field(None, description="Smoking status")
    alcohol_consumption: Optional[str] = Field(None, description="Alcohol consumption")
    exercise_frequency: Optional[str] = Field(None, description="Exercise frequency")
    
    # Insurance
    insurance_provider: Optional[str] = Field(None, description="Insurance provider")
    insurance_policy_number: Optional[str] = Field(None, description="Insurance policy number")
    
    # Emergency contacts
    emergency_contacts: List[EmergencyContact] = Field(default_factory=list, description="Emergency contacts")
    preferred_hospital: Optional[str] = Field(None, description="Preferred hospital")
    
    # Status
    signup_step: int = Field(..., description="Signup step")
    is_profile_complete: bool = Field(default=False, description="Profile complete")
    is_active: bool = Field(default=True, description="Active status")
    
    # Metadata
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")


class PatientListResponse(BaseResponseModel):
    """Patient list response with pagination."""
    patients: List[PatientResponse] = Field(..., description="List of patients")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    limit: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")


class PatientStatsResponse(BaseResponseModel):
    """Patient statistics response."""
    total_patients: int = Field(..., description="Total number of patients")
    active_patients: int = Field(..., description="Active patients")
    new_this_month: int = Field(..., description="New patients this month")
    completed_profiles: int = Field(..., description="Completed profiles")
    pending_verification: int = Field(..., description="Pending verification")
    by_age_group: dict = Field(..., description="Patients by age group")
    by_gender: dict = Field(..., description="Patients by gender")
    by_location: dict = Field(..., description="Patients by location")
    
    

