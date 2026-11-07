# src/models/user_core.py
"""User domain models - Pure Pydantic, no SQLAlchemy."""

from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class UserRole(str, Enum):
    """User roles enum."""
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class UserStatus(str, Enum):
    """User status enum - maps to your account_status column."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    LOCKED = "locked"
    PENDING = "pending"
    VERIFIED = "verified"


class UserAssistant(str, Enum):
    """User assistant types for role switching."""
    MEDIAID = "mediaid"
    MEDIDOC = "medidoc"


class ContextType(str, Enum):
    """Settings context types."""
    DEFAULT = "default"
    WEB = "web"
    MOBILE = "mobile"
    TABLET = "tablet"
    CLINIC_DASHBOARD = "clinic_dashboard"


class MedicusAgent(str, Enum):
    MEDIAID = 'MediAid'
    MEDIDOC = 'MediDoc'
    MEDINSIGHT = 'MedInsight'
    MEDILINK = 'Medilink'


class User(BaseModel):
    """User domain model - maps to auth.users table (authentication only)."""
    model_config = ConfigDict(from_attributes=True)

    # Core identity (auth.users table fields only)
    id: Optional[int] = None
    email: Optional[EmailStr] = None  # Nullable for phone-only auth
    phone_number: Optional[str] = None  # Nullable for email-only auth

    # Verification fields - updated for new schema
    is_email_verified: Optional[bool] = None  # Now nullable (NULL when using phone auth)
    is_phone_verified: bool = False  # New field for phone verification

    # role and user assistant
    role: UserRole  # Required - set at account creation
    user_assistant: UserAssistant = UserAssistant.MEDIAID  # Default to doctor mode

    password: str = Field(exclude=True)  # DB field is already hashed
    signup_step: int = 1
    status: UserStatus = Field(alias="account_status")

    metadata: Optional[dict] = Field(default_factory=dict)

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    # Security fields
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login: Optional[datetime] = None

    # Compatibility aliases for existing code
    @property
    def phone(self) -> Optional[str]:
        """Alias for phone_number for backward compatibility."""
        return self.phone_number

    @phone.setter
    def phone(self, value: Optional[str]) -> None:
        """Setter for phone compatibility."""
        self.phone_number = value

    @property
    def password_hash(self) -> str:
        """Alias for password field (which is already hashed in DB)."""
        return self.password

    @password_hash.setter
    def password_hash(self, value: str) -> None:
        """Setter for password_hash compatibility."""
        self.password = value

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
            raise ValueError('Invalid phone number format')
        return v

    @field_validator('email', 'phone_number')
    @classmethod
    def validate_auth_method(cls, v, info):
        """Ensure at least one authentication method is provided."""
        # This will be checked at the model level after all fields are set
        return v

    def model_post_init(self, __context):
        """Validate that at least one authentication method is provided."""
        if not self.email and not self.phone_number:
            raise ValueError('Either email or phone_number must be provided')


class UserProfile(BaseModel):
    """User profile domain model - auth.user_profiles table after cleanup."""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    
    # Core profile fields (bio and display_name removed from schema)
    timezone: str = "UTC"  # Moved from user_settings to user_profiles
    
    # Optional fields that may be expected by response models
    profile_type: Optional[str] = None
    profile_name: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    is_active: Optional[bool] = None
    is_primary: Optional[bool] = None

    # Metadata
    metadata: Optional[dict] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class UserSettings(BaseModel):
    """User settings domain model - auth.user_settings table after cleanup."""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    context_type: ContextType = ContextType.DEFAULT
    context_name: str

    # Notification settings
    voice_notifications: bool = True
    email_notifications: bool = True
    sms_notifications: bool = False
    push_notifications: bool = True

    # Privacy settings
    data_retention_days: int = Field(default=90, gt=0, le=365)
    privacy_level: str = "standard"
    share_data_with_providers: bool = True

    # UI/UX settings (timezone and language moved to user_profiles)
    theme: str = "light"
    default_view: str = "dashboard"
    items_per_page: int = Field(default=20, gt=0)
    auto_save: bool = True

    # Communication preferences
    preferred_contact_method: str = "email"
    appointment_reminders: bool = True
    reminder_advance_hours: int = Field(default=24, ge=0)

    # Device-specific settings
    device_token: Optional[str] = None
    fingerprint_enabled: bool = False
    auto_logout_minutes: int = Field(default=60, gt=0)

    # Metadata
    metadata: Optional[dict] = Field(default_factory=dict)
    is_active: bool = True
    is_default: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    @field_validator('privacy_level')
    @classmethod
    def validate_privacy_level(cls, v: str) -> str:
        if v not in ['standard', 'high', 'maximum']:
            raise ValueError('Privacy level must be standard, high, or maximum')
        return v

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in ['light', 'dark', 'auto']:
            raise ValueError('Theme must be light, dark, or auto')
        return v

    @field_validator('preferred_contact_method')
    @classmethod
    def validate_contact_method(cls, v: str) -> str:
        if v not in ['email', 'sms', 'phone', 'app', 'whatsapp']:
            raise ValueError('Contact method must be email, sms, phone, app, or whatsapp')
        return v


