"""Patient models for the Medicus platform."""

from medicus_common.models.patient.patient_core import (
    Patient,
    PatientStatus,
    Relationship,
)
from medicus_common.models.patient.patient_dependents import (
    CreateDependentPatientRequest,
    DependentOperationResponse,
    DependentPatientListResponse,
    DependentPatientResponse,
    DependentValidationError,
    EmergencyContact,
    RelationshipType,
    SwitchContextRequest,
    SwitchContextResponse,
    UpdateDependentPatientRequest,
)
from medicus_common.models.patient.patient_records import (
    InsuranceCoverage,
    MedicalExaminationRecord,
    MedicalNoteRecord,
    MedicalPrescriptionRecord,
    MedicalVisitRecord,
    PatientContact,
    PatientMedicalData,
    PatientMetadata,
)
from medicus_common.models.patient.patient_requests import (
    BasicProfileRequest,
    EmergencyContactRequest,
    MedicalDataUpdateRequest,
    PatientMetadataUpdateRequest,
    PatientProfileUpdateRequest,
    PatientRegistrationStep1Request,
    PatientRegistrationStep2Request,
    PatientSearchRequest,
)
from medicus_common.models.patient.patient_responses import (
    PatientListResponse,
    PatientProfileResponse,
    PatientRegistrationResponse,
    PatientResponse,
    PatientStatsResponse,
)

__all__ = [
    # patient_core
    "Patient",
    "PatientStatus",
    "Relationship",
    # patient_dependents
    "CreateDependentPatientRequest",
    "DependentOperationResponse",
    "DependentPatientListResponse",
    "DependentPatientResponse",
    "DependentValidationError",
    "EmergencyContact",
    "RelationshipType",
    "SwitchContextRequest",
    "SwitchContextResponse",
    "UpdateDependentPatientRequest",
    # patient_records
    "InsuranceCoverage",
    "MedicalExaminationRecord",
    "MedicalNoteRecord",
    "MedicalPrescriptionRecord",
    "MedicalVisitRecord",
    "PatientContact",
    "PatientMedicalData",
    "PatientMetadata",
    # patient_requests
    "BasicProfileRequest",
    "EmergencyContactRequest",
    "MedicalDataUpdateRequest",
    "PatientMetadataUpdateRequest",
    "PatientProfileUpdateRequest",
    "PatientRegistrationStep1Request",
    "PatientRegistrationStep2Request",
    "PatientSearchRequest",
    # patient_responses
    "PatientListResponse",
    "PatientProfileResponse",
    "PatientRegistrationResponse",
    "PatientResponse",
    "PatientStatsResponse",
]