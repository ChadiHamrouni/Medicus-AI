# src/models/common.py
"""Common API Models for MedicusRegistry."""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict

from medicus_common.models.base import BaseResponseModel


PHONE_NUMBER_PATTERN = r"^(?:\(\d{3}\)\s*\d{3}-\d{4}|\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})$"

def PhoneNumberField():
    return Field(
        description="A valid phone number, e.g., (555) 123-4567 or +12345678900.",
        pattern=PHONE_NUMBER_PATTERN,
        examples=["+12345678900", "(555) 123-4567"]
    )

# --- Add custom Email type ---
EMAIL_REGEX = r"^[\w\.\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-.]+$"

def EmailField():
    return Field(
        description="A valid email address.",
        pattern=EMAIL_REGEX,
        examples=["john.doe@example.com"]
    )
    
class Gender(str, Enum):
    """Gender enumeration."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class Address(BaseModel):
    """Address model."""
    street: str = Field(..., min_length=5, description="Street address")
    city: str = Field(..., min_length=2, description="City")
    state: Optional[str] = Field(None, description="State/Province")
    postal_code: str = Field(..., description="Postal/ZIP code")
    country: str = Field(..., min_length=2, description="Country")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude coordinate")

    @field_validator('postal_code')
    def validate_postal_code(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Postal code must be at least 3 characters')
        return v.strip()

    model_config = ConfigDict(extra='forbid')


class ContactInfo(BaseModel):
    """Contact information model."""
    professional_email: Optional[str] = Field(None, description="Professional email address")
    professional_phone: Optional[str] = Field(None, description="Professional phone number")
    office_phone: Optional[str] = Field(None, description="Office phone number")
    fax_number: Optional[str] = Field(None, description="Fax number")
    website_url: Optional[str] = Field(None, description="Website URL")

class Certification(BaseModel):
    certif_date: str  # The date the certification was granted
    title: str  # The name of the certification (e.g., "Board Certified in Cardiology")
    issuing_body: Optional[str] = None  # The organization or institution that issued the certification

class EmergencyContact(BaseModel):
    """Emergency contact model."""
    name: str = Field(..., min_length=2, description="Emergency contact name")
    relationship: str = Field(..., description="Relationship to patient")
    phone_number: str = Field(..., description="Emergency contact phone")
    country_code: Optional[str] = Field(None, description="Emergency contact country code")
    email: Optional[str] = Field(None, description="Emergency contact email")
    address: Optional[Address] = Field(None, description="Emergency contact address")
    is_primary: bool = Field(default=False, description="Is primary emergency contact")


class MedicalProcedure(BaseModel):
    category: str  # The category or type of medical procedure
    procedure_name: str  # The name of the specific medical procedure
    cost_range: Optional[str] = None # An object representing the range of costs for the procedure
    time_range: Optional[str] = None  # An object representing the range of time the procedure might take
    description: Optional[str] = None  # Description of the procedure
    fee: Optional[float] = None  # Fee for the procedure
    currency: Optional[str] = None  # Currency for the fee
    duration_minutes: Optional[int] = None  # Duration in minutes

class MedicalProcedureDetails(BaseModel):
    """Medical procedure details model."""
    procedure_name: str  # The name of the specific medical procedure
    procedure_price: str  # The price of the procedure
    description: Optional[str] = None  # Description of the procedure
    duration_minutes: Optional[int] = None  # Duration in minutes
    currency: Optional[str] = None  # Currency for this specific procedure  

class MedicalProceduresRequest(BaseModel):
    currency: Optional[str] = None  # Currency for the fees
    medical_procedures: List[MedicalProcedureDetails] = []  # List of medical procedures
    consultation_types: Optional[List[str]] = []  # List of consultation types (e.g., in-person, telemedicine)
    insurance_accepted: Optional[List[str]] = []  # List of accepted insurance providers



class WorkingHours(BaseModel):
    """Working hours model."""
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: str = Field(..., pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Start time (HH:MM)")
    end_time: str = Field(..., pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="End time (HH:MM)")
    is_available: bool = Field(default=True, description="Is available on this day")
    break_start: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Break start time")
    break_end: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Break end time")

class MedicalCertification(BaseModel):
    certif_date: str  # The date the certification was granted
    title: str  # The name of the certification (e.g., "Board Certified in Cardiology")
    issuing_body: Optional[str] = None  # The organization or institution that issued the certification

class Location(BaseModel):
    """Location model for practices/clinics."""
    name: str = Field(..., min_length=2, description="Location name")
    address: Address = Field(..., description="Location address")
    phone_number: Optional[str] = Field(None, description="Location phone number")
    is_primary: bool = Field(default=False, description="Is primary location")
    working_hours: List[WorkingHours] = Field(default_factory=list, description="Working hours")


class FileUpload(BaseModel):
    """File upload model."""
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type")
    size: int = Field(..., gt=0, le=10_000_000, description="File size in bytes (max 10MB)")
    file_path: str = Field(..., description="Stored file path")
    upload_date: str = Field(..., description="Upload timestamp")
    

class PaginationRequest(BaseModel):
    """Pagination request model."""
    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$", description="Sort order")


class ValidationError(BaseModel):
    """Validation error model."""
    field: str = Field(..., description="Field with error")
    message: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code")


class ErrorResponse(BaseResponseModel):
    """Error response model."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[List[ValidationError]] = Field(None, description="Validation errors")
    request_id: Optional[str] = Field(None, description="Request tracking ID")
    timestamp: str = Field(..., description="Error timestamp")