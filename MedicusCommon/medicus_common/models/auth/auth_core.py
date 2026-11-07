# src/models/auth_core.py
"""Authentication API Models for MedicusRegistry."""

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from medicus_common.models.user.user_core import UserRole


class TokenData(BaseModel):
    """Token data model for JWT tokens."""
    model_config = ConfigDict(from_attributes=True)

    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[UserRole] = None
    scopes: list[str] = Field(default_factory=list)


