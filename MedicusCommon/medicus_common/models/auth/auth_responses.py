# src/models/auth_core.py
"""Authentication API Models for MedicusRegistry."""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from medicus_common.models.user.user_core import UserStatus
from medicus_common.models.base import BaseResponseModel
from medicus_common.models.user.user_core import UserRole


class AuthResponse(BaseResponseModel):
    """Authentication response model - updated for new schema."""
    user_id: int = Field(..., description="User ID")
    access_token: str = Field(..., description="JWT access token")
    refresh_token: Optional[str] = Field(None, description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user_role: str = Field(..., description="User role")
    signup_step: Optional[int] = Field(None, description="Current signup step")
    
    # Updated verification fields
    is_email_verified: Optional[bool] = Field(None, description="Email verification status (NULL for phone-only users)")
    is_phone_verified: bool = Field(default=False, description="Phone verification status")
    
    # Auth method info
    email: Optional[str] = Field(None, description="User's email if provided")
    phone_number: Optional[str] = Field(None, description="User's phone if provided")
    

class UserResponse(BaseModel):
    """User response model - updated for new schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: Optional[str] = None  # Now nullable
    phone_number: Optional[str] = None  # Now nullable
    role: UserRole
    account_status: UserStatus  # Use your exact column name
    signup_step: int
    is_email_verified: Optional[bool] = None  # Now nullable (NULL for phone-only)
    is_phone_verified: bool = False  # New field
    created_at: datetime
    last_login: Optional[datetime] = None


class TokenResponse(BaseModel):
    """Enhanced token response model with complete profile data."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Optional[UserResponse] = None
    # Profile data from materialized views - populated at login time
    doctorProfile: Optional[Dict[str, Any]] = None
    patientProfile: Optional[Dict[str, Any]] = None


class EmailVerificationResponse(BaseModel):
    """Email verification response."""
    message: str
    email: str
    expires_in_minutes: int = 15


class PasswordResetResponse(BaseModel):
    """Password reset response."""
    message: str
    email: str