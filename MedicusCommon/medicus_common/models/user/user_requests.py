# src/models/user_core.py
"""User domain models - Pure Pydantic, no SQLAlchemy."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

from .user_core import UserRole, UserAssistant


class UserLoginRequest(BaseModel):
  """User login request - accepts email or phone + password."""
  identifier: str = Field(..., description="Email or phone number")
  password: str = Field(..., min_length=1, description="User password")


class UserRegisterRequest(BaseModel):
    """User registration request model."""

    email: Optional[EmailStr] = Field(
        None, max_length=50, description="User email (required if no phone provided)"
    )
    phone_number: Optional[str] = Field(
        None, max_length=20, description="User phone number (required if no email provided)"
    )
    password: str = Field(..., min_length=8, description="User password")
    role: UserRole = Field(..., description="Role of the user: patient or doctor")
    signup_step: int = Field(default=1, description="Current signup step")
    first_name: str = Field(..., max_length=50, description="User first name")
    last_name: str = Field(..., max_length=50, description="User last name")
    dob: Optional[str] = Field(None, description="Date of birth in YYYY-MM-DD format")
    gender: Optional[str] = Field(None, description="Gender of the user")
    specialty_id: Optional[int] = Field(None, description="Specialty ID for doctors")
    medical_licence: Optional[str] = Field(None, max_length=30, description="Medical licence number for doctors")

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.replace("+", "").replace("-", "").replace(" ", "").replace("(", "").replace(")", "").isdigit():
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("role")
    @classmethod
    def no_self_service_admin(cls, v: UserRole) -> UserRole:
        # Administrators are created by operators (scripts/create_admin.py), never by sign-up.
        if v == UserRole.ADMIN:
            raise ValueError("role must be 'patient' or 'doctor'")
        return v

    def model_post_init(self, __context):
        """Ensure at least one authentication method is provided."""
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone_number must be provided")


class UserUpdateRequest(BaseModel):
    """User update request."""
    email: Optional[str] = Field(None, max_length=30)
    phone: Optional[str] = Field(None, max_length=20)
    user_assistant: Optional[UserAssistant] = Field(None, description="User assistant mode (mediaid/medidoc)")


class PasswordChangeRequest(BaseModel):
    """Request model for changing user password."""
    old_password: str = Field(..., min_length=8, description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., min_length=8, description="Confirm new password")

    def validate_passwords(self):
        """Validate that new password and confirm password match."""
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password do not match")
        return self


