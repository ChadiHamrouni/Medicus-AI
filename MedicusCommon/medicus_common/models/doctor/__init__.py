"""Doctor models for the Medicus platform."""

from medicus_common.models.doctor.doctor_core import (
    Doctor,
    DoctorStatus,
)
from medicus_common.models.doctor.doctor_view import (
    DoctorView,
    DoctorDetailsView,
    DoctorAnalyticsView,
    DoctorDiscoveryView,
    DoctorDiscoveryCard,
    DoctorOONView,
    DoctorSearchResponse,
    WorkingHourSlot,
    MedicalProcedureInfo,
    Certification,
    Address,
)
from medicus_common.models.doctor.doctor_events import (
    DoctorEvent,
    DoctorEventsResponse,
)
from medicus_common.models.doctor.doctor_documents import (
    BulkDocumentUploadRequest,
    BulkDocumentUploadResponse,
    DoctorCredentialCategory,
    DoctorDocumentCategory,
    DoctorDocumentDB,
    DoctorDocumentMetadata,
    DoctorDocumentUploadRequest,
    DoctorDocumentUploadResponse,
    DocumentFilter,
    DocumentListResponse,
    DocumentSearchResponse,
    DocumentStatsResponse,
    DocumentStatus,
    DocumentVisibility,
    MedicalSpecialty,
)
from medicus_common.models.doctor.doctor_records import (
    DoctorContact,
    DoctorMetadata,
    DoctorProfileAdditionalInformation,
    DoctorProfileAdditionalLink,
    DoctorProfileAdditionalLinks,
    DoctorProfileLocation,
    DoctorProfilePracticeInfo,
    DoctorProfileTimeSlot,
    DoctorProfileWorkingHours,
)
from medicus_common.models.doctor.doctor_requests import (
    DoctorRegistrationRequest,
    DoctorRegistrationStep1Request,
    DoctorRegistrationStep2Request,
    DoctorSearchRequest,
    DoctorUpdateRequest,
    PracticeInfoRequest,
    ProfessionalInfoRequest,
    ProfessionalInfoUpdateRequest,
    WorkingHoursRequest,
)
from medicus_common.models.doctor.doctor_responses import (
    DoctorListResponse,
    DoctorProfileResponse,
    DoctorRegistrationResponse,
    DoctorResponse,
    ExtendedDoctorProfileResponse,
)

__all__ = [
    # doctor_core
    "Doctor",
    "DoctorStatus",
    # doctor_view
    "DoctorView",
    "DoctorDetailsView",
    "DoctorAnalyticsView",
    "DoctorDiscoveryView",
    "DoctorDiscoveryCard",
    "DoctorOONView",
    "DoctorSearchResponse",
    "WorkingHourSlot",
    "MedicalProcedureInfo",
    "Certification",
    "Address",
    # doctor_events
    "DoctorEvent",
    "DoctorEventsResponse",
    # doctor_documents
    "BulkDocumentUploadRequest",
    "BulkDocumentUploadResponse",
    "DoctorCredentialCategory",
    "DoctorDocumentCategory",
    "DoctorDocumentDB",
    "DoctorDocumentMetadata",
    "DoctorDocumentUploadRequest",
    "DoctorDocumentUploadResponse",
    "DocumentFilter",
    "DocumentListResponse",
    "DocumentSearchResponse",
    "DocumentStatsResponse",
    "DocumentStatus",
    "DocumentVisibility",
    "MedicalSpecialty",
    # doctor_records
    "DoctorContact",
    "DoctorMetadata",
    "DoctorProfileAdditionalInformation",
    "DoctorProfileAdditionalLink",
    "DoctorProfileAdditionalLinks",
    "DoctorProfileLocation",
    "DoctorProfilePracticeInfo",
    "DoctorProfileTimeSlot",
    "DoctorProfileWorkingHours",
    # doctor_requests
    "DoctorRegistrationRequest",
    "DoctorRegistrationStep1Request",
    "DoctorRegistrationStep2Request",
    "DoctorSearchRequest",
    "DoctorUpdateRequest",
    "PracticeInfoRequest",
    "ProfessionalInfoRequest",
    "ProfessionalInfoUpdateRequest",
    "WorkingHoursRequest",
    # doctor_responses
    "DoctorListResponse",
    "DoctorProfileResponse",
    "DoctorRegistrationResponse",
    "DoctorResponse",
    "ExtendedDoctorProfileResponse",
]