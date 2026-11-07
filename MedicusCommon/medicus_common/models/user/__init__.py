"""User models for the Medicus platform."""

from medicus_common.models.user.user_core import (
    ContextType,
    MedicusAgent,
    User,
    UserAssistant,
    UserProfile,
    UserRole,
    UserSettings,
    UserStatus,
)
from medicus_common.models.user.user_requests import (
    PasswordChangeRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserUpdateRequest,
)
from medicus_common.models.user.user_responses import (
    PaginatedUserSearchResponse,
    UserResponse,
)

__all__ = [
    # user_core
    "ContextType",
    "MedicusAgent",
    "User",
    "UserAssistant",
    "UserProfile",
    "UserRole",
    "UserSettings",
    "UserStatus",
    # user_requests
    "PasswordChangeRequest",
    "UserLoginRequest",
    "UserRegisterRequest",
    "UserUpdateRequest",
    # user_responses
    "PaginatedUserSearchResponse",
    "UserResponse",
]