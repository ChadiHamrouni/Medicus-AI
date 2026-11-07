# src/models/doctor_core.py
"""Doctor API Models for MedicusRegistry."""

from typing import Optional, List
from pydantic import BaseModel
from enum import Enum

from medicus_common.models.common import Address, Location, Gender, PhoneNumberField, WorkingHours, MedicalProcedure, MedicalCertification
from medicus_common.models.doctor.doctor_records import DoctorContact, DoctorMetadata


class DoctorStatus(str, Enum):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    SUSPENDED = 'SUSPENDED'

    
class Doctor(BaseModel):
    id: int  # Unique identifier for the doctor
    first_name: str  # Doctor's first name
    last_name: str  # Doctor's last name
    specialty: str  # String representation of the specialty name
    phone_number: str = PhoneNumberField()  # Doctor's main phone number for communication
    medical_licence: str  # Doctor's medical licence
    specialty_id: int  # Identifier for the doctor's primary specialty
    status: Optional[DoctorStatus] = None
    other_specialties: Optional[List[str]] = None  # List of other specialty names, default to None
    gender: Optional[Gender]
    country_id: int  # Identifier for the doctor's country
    country: str  # String representation of the country name
    language: str  # String representation of the language name
    address: Optional[Address] = None  # Dictionary representing type and full address
    other_locations: Optional[List[Location]] = None  # List of dictionaries representing other locations, default to None
    contact: Optional[DoctorContact] = None  # Dictionary containing contact information, default to None
    metadata: Optional[DoctorMetadata] = None  # Dictionary containing additional metadata about the doctor, default to None
    working_hours: Optional[List[WorkingHours]] = None  # List of `WorkingHour` objects representing the doctor's working hours
    medical_procedures: Optional[List[MedicalProcedure]] = None  # List of `MedicalProcedure` objects representing procedures the doctor can perform, default to None
    certifications: Optional[List[MedicalCertification]] = None  # List of professional certifications, default to None

    model_config = {
        'extra': 'forbid'
    }
    

