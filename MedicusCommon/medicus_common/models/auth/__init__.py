# medicus_common/models/auth/__init__.py
"""Authentication models module."""

from medicus_common.models.auth.auth_requests import (
    AuthMethodChoiceRequest,
    AuthRegistrationRequest,
    RoleChoiceRequest,
    LoginRequest,
    VerifyEmailRequest,
    VerifyPhoneRequest,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirmRequest,
    ChangePasswordRequest,
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    EmailVerificationRequest,
    EmailVerificationCodeRequest,
    PasswordResetCodeRequest,
)

from medicus_common.models.auth.auth_responses import (
    AuthResponse,
    UserResponse,
    TokenResponse,
    EmailVerificationResponse,
    PasswordResetResponse,
)

from medicus_common.models.auth.auth_core import (
    TokenData,
)

__all__ = [
    # Requests
    "AuthMethodChoiceRequest",
    "AuthRegistrationRequest",
    "RoleChoiceRequest",
    "LoginRequest",
    "VerifyEmailRequest",
    "VerifyPhoneRequest",
    "RefreshTokenRequest",
    "PasswordResetRequest",
    "PasswordResetConfirmRequest",
    "ChangePasswordRequest",
    "UserRegisterRequest",
    "UserLoginRequest",
    "UserUpdateRequest",
    "EmailVerificationRequest",
    "EmailVerificationCodeRequest",
    "PasswordResetCodeRequest",

    # Responses
    "AuthResponse",
    "UserResponse",
    "TokenResponse",
    "EmailVerificationResponse",
    "PasswordResetResponse",

    # Core
    "TokenData",
]