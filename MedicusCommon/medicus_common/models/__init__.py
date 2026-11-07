# src/models/__init__.py
"""MedicusCommon API Models - Shared models for all Medicus microservices."""

from medicus_common.models.auth.auth_responses import AuthResponse
from medicus_common.models.auth.auth_requests import AuthRegistrationRequest, LoginRequest, VerifyEmailRequest
from .common import Address, Gender, ContactInfo, EmergencyContact
from medicus_common.models.user.user_core import User, UserRole, UserStatus
from medicus_common.models.user.user_requests import UserLoginRequest, UserRegisterRequest, UserUpdateRequest, PasswordChangeRequest
from medicus_common.models.user.user_responses import UserResponse, PaginatedUserSearchResponse
from medicus_common.models.doctor.doctor_core import Doctor
from medicus_common.models.doctor.doctor_requests import (
    DoctorSearchRequest,
    DoctorUpdateRequest,
    DoctorRegistrationStep1Request,
    DoctorRegistrationStep2Request,
    DoctorRegistrationRequest
)
from medicus_common.models.doctor.doctor_responses import (
    DoctorListResponse,
    DoctorRegistrationResponse,
    DoctorResponse,
    DoctorProfileResponse,
    ExtendedDoctorProfileResponse
)
from medicus_common.models.patient.patient_core import Patient
from medicus_common.models.patient.patient_requests import (
    PatientSearchRequest,
    PatientMetadataUpdateRequest,
    PatientProfileUpdateRequest,
    PatientRegistrationStep1Request,
    PatientRegistrationStep2Request
)
from medicus_common.models.patient.patient_responses import (
    PatientResponse,
    PatientListResponse,
    PatientProfileResponse,
    PatientStatsResponse,
    PatientRegistrationResponse
)
from medicus_common.models.convo.convo_core import Conversation
from medicus_common.models.convo.convo_records import Message
from medicus_common.models.convo.convo_requests import (
    ConversationCreateRequest,
    MessageCreateRequest
)
from medicus_common.models.convo.convo_responses import (
    ConversationState,
    ConversationHead,
    ConversationSummary,
    ConversationListResponse
)

from .ticket import (
    # Enums
    TicketStatus,
    TicketPriority,
    TicketCategory,
    # Core Models
    Ticket,
    TicketResponse,
    Attachment,
    Comment,
    # Response Models
    SupportTicketsResponse,
    SupportTicketResultResponse,
)

__all__ = [
    # Auth
    "AuthResponse",
    "AuthRegistrationRequest",
    "LoginRequest",
    "VerifyEmailRequest",

    # Common
    "Address",
    "Gender",
    "ContactInfo",
    "EmergencyContact",

    # User Core
    "User",
    "UserRole",
    "UserStatus",

    # User requests
    "UserLoginRequest",
    "UserRegisterRequest",
    "UserUpdateRequest",
    "PasswordChangeRequest",

    # User Responses
    "UserResponse",
    "PaginatedUserSearchResponse",

    # Doctor
    "Doctor",
    "DoctorSearchRequest",
    "DoctorUpdateRequest",
    "DoctorRegistrationStep1Request",
    "DoctorRegistrationStep2Request",
    "DoctorRegistrationRequest",
    "DoctorListResponse",
    "DoctorRegistrationResponse",
    "DoctorResponse",
    "DoctorProfileResponse",
    "ExtendedDoctorProfileResponse",

    # Patient
    "Patient",
    "PatientSearchRequest",
    "PatientMetadataUpdateRequest",
    "PatientProfileUpdateRequest",
    "PatientRegistrationStep1Request",
    "PatientRegistrationStep2Request",
    "PatientResponse",
    "PatientListResponse",
    "PatientProfileResponse",
    "PatientStatsResponse",
    "PatientRegistrationResponse",

    # Conversation
    "Conversation",
    "Message",
    "ConversationCreateRequest",
    "MessageCreateRequest",
    "ConversationState",
    "ConversationHead",
    "ConversationSummary",
    "ConversationListResponse",

    # Support Tickets
    "TicketStatus",
    "TicketPriority",
    "TicketCategory",
    "Ticket",
    "TicketResponse",
    "Attachment",
    "Comment",
    "SupportTicketsResponse",
    "SupportTicketResultResponse",
]