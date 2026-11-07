# medicus_common/models/patient_core.py
# Core patient domain models (Patient, PatientStatus, Relationship, MedicalData, InsuranceCoverage, Metadata)

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from medicus_common.models.common import EmergencyContact, Gender
from .patient_records import PatientMedicalData, PatientMetadata, InsuranceCoverage

class Relationship(str, Enum):
    """Family relationships for dependents."""
    SELF = "self"
    SPOUSE = "spouse"
    CHILD = "child"
    PARENT = "parent"
    SIBLING = "sibling"
    OTHER = "other"


class PatientStatus(str, Enum):
    """Patient status in the system."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class Patient(BaseModel):
    """Complete patient model matching patients_view materialized view."""
    # Basic identification
    id: int = Field(..., description="Unique identifier for the patient")
    wa_number: str = Field(..., description="WhatsApp number - unique identifier")
    user_id: Optional[int] = Field(None, description="Foreign key reference to auth.users table")

    # Personal information
    first_name: Optional[str] = Field(None, description="Patient first/given name")
    last_name: Optional[str] = Field(None, description="Patient last/family name")
    dob: Optional[date] = Field(None, description="Date of birth")
    gender: Optional[Gender] = Field(None, description="Patient gender")
    age: Optional[int] = Field(None, description="Calculated age")

    # Status and relationships
    status: PatientStatus = Field(default=PatientStatus.ACTIVE, description="Patient status")
    relationship: str = Field(default="main", description="Relationship type for family members")

    # Contact and location
    contact: Optional[Dict[str, Any]] = Field(None, description="Contact information JSON")
    address: Optional[Dict[str, Any]] = Field(None, description="Address information JSON")
    emergency_contact: Optional[List[EmergencyContact]] = Field(
        default_factory=list,
        description="List of emergency contact information"
    )
    # References
    country_id: int = Field(default=1, description="Foreign key reference to countries table")
    language_id: int = Field(default=1, description="Foreign key reference to languages table")

    # Structured data
    metadata: Optional[PatientMetadata] = Field(None, description="Profile metadata JSON")
    medical_data: Optional[PatientMedicalData] = Field(None, description="Medical data JSON")
    insurance_coverage: Optional[InsuranceCoverage] = Field(None, description="Insurance information JSON")

    # Medical records from materialized view
    past_medical_visits: Optional[List[Dict[str, Any]]] = Field(None, description="Past medical visits from materialized view")
    upcoming_medical_visits: Optional[List[Dict[str, Any]]] = Field(None, description="Upcoming medical visits from materialized view")
    medical_examinations: Optional[List[Dict[str, Any]]] = Field(None, description="Medical examinations from materialized view")
    medical_notes: Optional[List[Dict[str, Any]]] = Field(None, description="Medical notes from materialized view")
    medical_prescriptions: Optional[List[Dict[str, Any]]] = Field(None, description="Medical prescriptions from materialized view")

    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    @property
    def full_name(self) -> str:
        """Get patient's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or ""

    @property
    def phone_number(self) -> Optional[str]:
        """Get primary phone number from contact or wa_number."""
        if self.contact and isinstance(self.contact, dict) and self.contact.get('phone'):
            return self.contact['phone']
        return self.wa_number


