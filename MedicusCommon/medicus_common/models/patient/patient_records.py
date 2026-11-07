# medicus_common/models/patient/patient_records.py
"""Related patient medical records for materialized view aggregations."""

from datetime import date
from typing import Optional, Union, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

from medicus_common.models.common import PhoneNumberField



class PatientMedicalData(BaseModel):
    """Medical data stored in patients.medical_data JSON field."""
    chronic_conditions: List[str] = Field(default_factory=list, description="List of chronic medical conditions")
    blood_type: Optional[str] = Field(None, description="Patient blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)")
    allergies: Optional[str] = Field(None, description="Known allergies and sensitivities")
    other_conditions: Optional[str] = Field(None, description="Additional medical conditions not in chronic_conditions list")
    family_medical_history: Optional[str] = Field(None, description="Family medical history information")
    smoking_status: Optional[str] = Field(None, description="Smoking status (never, former, current)")
    alcohol_consumption: Optional[str] = Field(None, description="Alcohol consumption habits")
    exercise_frequency: Optional[str] = Field(None, description="Exercise frequency and habits")
    previous_surgeries: List[str] = Field(default_factory=list, description="List of previous surgical procedures")
    special_instructions: Optional[str] = Field(None, description="Special medical instructions or notes")
    medical_conditions: Optional[List[str]] = Field(default_factory=list, description="List of diagnosed medical conditions")


class PatientMetadata(BaseModel):
    """Metadata stored in patients.metadata JSON field."""
    height: Optional[str] = Field(None, description="Patient height (e.g., '5\'11\"')")
    weight: Optional[str] = Field(None, description="Patient weight (e.g., '180 lbs')")
    marital_status: Optional[str] = Field(None, description="Marital status (single, married, divorced, etc.)")
    occupation: Optional[str] = Field(None, description="Patient occupation/job title")
    preferred_hospital: Optional[str] = Field(None, description="Preferred hospital for emergencies")
    medical_power_of_attorney: Optional[str] = Field(None, description="Medical power of attorney contact")


class PatientContact(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    # Add other contact fields as needed

class InsuranceCoverage(BaseModel):
    payer_name: Optional[str] = None  # e.g., "Blue Cross Blue Shield"
    plan_name: Optional[str] = None   # e.g., "PPO Silver"
    member_id: Optional[str] = None   # e.g., "1234567890"
    group_number: Optional[str] = None  # e.g., "GRP123456"
    coverage_start_date: Optional[date] = None
    coverage_end_date: Optional[date] = None
    payer_phone: str = PhoneNumberField()  # e.g., "1-800-555-1234"
    policy_holder_name: Optional[str] = None  # e.g., "John Doe"
    relationship_to_subscriber: Optional[str] = None  # e.g., "Self", "Spouse", "Child"
    coverage_type: Optional[str] = None  # e.g., "Private", "Medicare", "Medicaid"


class MedicalVisitRecord(BaseModel):
    """Represents a single medical visit for a patient."""
    visit_id: int
    doctor_name: str
    visit_date: date
    reason: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class MedicalPrescriptionRecord(BaseModel):
    """Represents a medical prescription given to a patient."""
    prescription_id: int
    doctor_name: str
    medication_name: str
    dosage: str
    frequency: str
    start_date: date
    end_date: Optional[date] = None
    instructions: Optional[str] = None


class MedicalExaminationRecord(BaseModel):
    """Represents a medical examination or test performed on a patient."""
    exam_id: int
    exam_type: str
    exam_date: date
    results: Union[str, Dict[str, Any]]  # can be free-text or structured JSON
    doctor_name: Optional[str] = None
    notes: Optional[str] = None


class MedicalNoteRecord(BaseModel):
    """Represents a free-form note about a patient."""
    doctor_name: str
    note_date: date
    note_details: Union[str, Dict[str, Any]]  # Allow both string and dict
