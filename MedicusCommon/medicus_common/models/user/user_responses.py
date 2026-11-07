# src/models/user_core.py
"""User domain models - Pure Pydantic, no SQLAlchemy."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from .user_core import UserRole, UserStatus


class UserResponse(BaseModel):
    """User response model."""
    id: int
    role: UserRole
    email: Optional[str] = None
    is_email_verified: Optional[bool] = None
    phone_number: Optional[str] = None
    is_phone_verified: Optional[bool] = None
    account_status: UserStatus
    signup_step: int
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedUserSearchResponse(BaseModel):
    """Paginated user search response in Django REST Framework format."""
    results: List[UserResponse]
    count: int = Field(description="Total number of items")
    next: Optional[str] = Field(None, description="URL for next page")
    previous: Optional[str] = Field(None, description="URL for previous page")

    model_config = ConfigDict(from_attributes=True)


