# medicus_common/models/patient_core.py
"""Patient domain models - for patients table (domain-specific data only)."""

from datetime import date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from medicus_common.models.common import Address, Gender, EmergencyContact
from medicus_common.models.patient.patient_records import InsuranceCoverage


class PatientRegistrationStep1Request(BaseModel):
    """Step 1: Choose authentication method (handled by auth service)."""
    # This is just the choice of method, actual auth data goes to AuthRegistrationRequest
    auth_method: str = Field(..., description="phone, email, or google")

class PatientRegistrationStep2Request(BaseModel):
    """Step 2: Patient-specific domain data (goes to patients table)."""
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    date_of_birth: date
    gender: Optional[Gender] = None
    terms_accepted: bool = Field(..., description="Terms acceptance")


class BasicProfileRequest(BaseModel):
    """Basic profile information for patients."""
    date_of_birth: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    gender: Gender = Field(..., description="Gender")
    phone_number: Optional[str] = Field(None, description="Additional phone number")
    address: Address = Field(..., description="Home address")
    preferred_language: str = Field(default="en", description="Preferred language")
    marital_status: Optional[str] = Field(None, description="Marital status")
    occupation: Optional[str] = Field(None, description="Occupation")
    

class EmergencyContactRequest(BaseModel):
    """Emergency contact request for patients."""
    emergency_contacts: List[EmergencyContact] = Field(..., min_items=1, description="Emergency contacts")
    medical_power_of_attorney: Optional[str] = Field(None, description="Medical power of attorney")
    preferred_hospital: Optional[str] = Field(None, description="Preferred hospital")
    special_instructions: Optional[str] = Field(None, description="Special medical instructions")
    

class MedicalDataUpdateRequest(BaseModel):
    """Request model for updating medical_data JSON field."""
    chronic_conditions: Optional[List[str]] = Field(None, description="Chronic medical conditions")
    blood_type: Optional[str] = Field(None, description="Patient blood type")
    allergies: Optional[str] = Field(None, description="Known allergies and sensitivities")
    other_conditions: Optional[str] = Field(None, description="Additional medical conditions")
    family_medical_history: Optional[str] = Field(None, description="Family medical history")
    smoking_status: Optional[str] = Field(None, description="Smoking status")
    alcohol_consumption: Optional[str] = Field(None, description="Alcohol consumption")
    exercise_frequency: Optional[str] = Field(None, description="Exercise frequency")
    previous_surgeries: Optional[List[str]] = Field(None, description="Previous surgeries")
    special_instructions: Optional[str] = Field(None, description="Special medical instructions")


class PatientMetadataUpdateRequest(BaseModel):
    """Request model for updating metadata JSON field."""
    height: Optional[str] = Field(None, description="Patient height")
    weight: Optional[str] = Field(None, description="Patient weight")
    marital_status: Optional[str] = Field(None, description="Marital status")
    occupation: Optional[str] = Field(None, description="Occupation")
    preferred_hospital: Optional[str] = Field(None, description="Preferred hospital")
    medical_power_of_attorney: Optional[str] = Field(None, description="Medical power of attorney")


class PatientProfileUpdateRequest(BaseModel):
    """Patient profile update request."""
    # Basic info updates
    first_name: Optional[str] = Field(None, min_length=1, description="First name")
    last_name: Optional[str] = Field(None, min_length=1, description="Last name")
    dob: Optional[date] = Field(None, description="Date of birth")
    gender: Optional[Gender] = Field(None, description="Gender")
    country_id: Optional[int] = Field(None, description="Country ID")

    # Contact updates
    contact: Optional[Dict[str, Any]] = Field(None, description="Contact information")
    address: Optional[Dict[str, Any]] = Field(None, description="Address information")
    # None = not sent (leave unchanged); [] = explicitly clear.
    emergency_contact: Optional[List[EmergencyContact]] = Field(
        None,
        description="List of emergency contact information"
    )

    # Structured data updates
    metadata: Optional[PatientMetadataUpdateRequest] = Field(None, description="Metadata updates")
    medical_data: Optional[MedicalDataUpdateRequest] = Field(None, description="Medical data updates")
    insurance_coverage: Optional[InsuranceCoverage] = Field(None, description="Insurance updates")


class PatientSearchRequest(BaseModel):
    """Patient search request."""
    name: Optional[str] = Field(None, description="Name filter")
    whatsapp_number: Optional[str] = Field(None, description="WhatsApp number filter")
    email: Optional[str] = Field(None, description="Email filter")
    age_range: Optional[str] = Field(None, description="Age range filter (e.g., '18-65')")
    gender: Optional[Gender] = Field(None, description="Gender filter")
    location: Optional[str] = Field(None, description="Location filter")
    chronic_condition: Optional[str] = Field(None, description="Chronic condition filter")
    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")

