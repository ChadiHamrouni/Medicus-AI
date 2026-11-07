# src/models/auth_core.py
"""Authentication API Models for MedicusRegistry."""

from datetime import date
from typing import Optional
from pydantic import AliasChoices, BaseModel, EmailStr, Field, field_validator

from medicus_common.models.user.user_core import UserRole


class AuthMethodChoiceRequest(BaseModel):
    """Step 1: Choose authentication method."""
    auth_method: str = Field(..., description="Authentication method: phone, email, or google")


class AuthRegistrationRequest(BaseModel):
    """Step 2: Authentication credentials (goes to auth.users table only)."""
    # Authentication method - at least one required  
    email: Optional[EmailStr] = Field(None, description="Email address (required if auth_method=email)")
    phone_number: Optional[str] = Field(None, description="Phone number (required if auth_method=phone)")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")
    
    # Basic required fields
    terms_accepted: bool = Field(..., description="Terms and conditions acceptance")
    
    def model_post_init(self, __context):
        """Validate that at least one authentication method is provided."""
        if not self.email and not self.phone_number:
            raise ValueError('Either email or phone_number must be provided')


class RoleChoiceRequest(BaseModel):
    """Step 3: Choose user role (patient or doctor)."""
    role: str = Field(..., description="User role: patient or doctor")
    

class LoginRequest(BaseModel):
    """User login request model - supports email or phone login."""
    identifier: str = Field(..., description="Email address or phone number")
    password: str = Field(..., description="Password")
    device_id: Optional[str] = Field(None, description="Device identifier")
    

class VerifyEmailRequest(BaseModel):
    """Email verification request model."""
    user_id: int = Field(..., description="User ID")
    verification_code: str = Field(..., description="Email verification code")


class VerifyPhoneRequest(BaseModel):
    """Phone verification request model."""
    user_id: int = Field(..., description="User ID")
    verification_code: str = Field(..., description="Phone verification code")
    

class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str = Field(..., description="Refresh token")
    

class PasswordResetRequest(BaseModel):
    """Password reset request (codes are delivered by email).

    Accepts ``{"email": ...}`` (what the app sends) or the older ``{"identifier": ...}``.
    """
    email: EmailStr = Field(..., validation_alias=AliasChoices("email", "identifier"),
                            description="Account email address")


class PasswordResetConfirmRequest(BaseModel):
    """Password reset confirmation request model."""
    reset_token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    

class ChangePasswordRequest(BaseModel):
    """Change password request model."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


class UserRegisterRequest(BaseModel):
    """User registration request - updated for new schema."""
    # Authentication (either email or phone required)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.PATIENT

    def model_post_init(self, __context):
        """Validate that at least one authentication method is provided."""
        if not self.email and not self.phone_number:
            raise ValueError('Either email or phone_number must be provided')

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
            raise ValueError('Invalid phone number format')
        return v


class UserLoginRequest(BaseModel):
    """User login request - supports email or phone."""
    identifier: str = Field(..., description="Email or phone number")
    password: str


class UserUpdateRequest(BaseModel):
    """User update request."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone_number: Optional[str] = Field(None, max_length=20)
    dob: Optional[date] = None

class ProfileUpdateRequest(BaseModel):
    """Profile update request model."""
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=500)
    timezone: Optional[str] = None
    language: Optional[str] = None
    notifications_enabled: Optional[bool] = None

class SettingsUpdateRequest(BaseModel):
    """Settings update request model."""
    voice_notifications: Optional[bool] = None
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    data_retention_days: Optional[int] = Field(default=None, gt=0, le=365)
    privacy_level: Optional[str] = None
    theme: Optional[str] = None
    auto_logout_minutes: Optional[int] = Field(default=None, gt=0)

    @field_validator('privacy_level')
    @classmethod
    def validate_privacy_level(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ['standard', 'high', 'maximum']:
            raise ValueError('Privacy level must be standard, high, or maximum')
        return v

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ['light', 'dark', 'auto']:
            raise ValueError('Theme must be light, dark, or auto')
        return v
    
    
class EmailVerificationRequest(BaseModel):
    """Email verification code request."""
    email: EmailStr


class EmailVerificationCodeRequest(BaseModel):
    """Email verification code submission."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")


class PasswordResetCodeRequest(BaseModel):
    """Password reset with code."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


