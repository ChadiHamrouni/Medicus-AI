# src/models/permissions.py
"""Permission and role domain model definitions."""

from enum import Enum
from pydantic import BaseModel, ConfigDict


class Permission(str, Enum):
    """System permissions."""
    # User permissions
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"

    # Profile permissions
    PROFILE_READ = "profile:read"
    PROFILE_WRITE = "profile:write"

    # Admin permissions
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"
    ADMIN_DELETE = "admin:delete"

    # System permissions
    SYSTEM_HEALTH = "system:health"
    SYSTEM_METRICS = "system:metrics"


class RolePermissions(BaseModel):
    """Role permissions mapping."""
    PATIENT_PERMISSIONS = [
        Permission.USER_READ,
        Permission.PROFILE_READ,
        Permission.PROFILE_WRITE,
    ]

    DOCTOR_PERMISSIONS = [
        Permission.USER_READ,
        Permission.PROFILE_READ,
        Permission.PROFILE_WRITE,
    ]

    ADMIN_PERMISSIONS = [
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.USER_DELETE,
        Permission.PROFILE_READ,
        Permission.PROFILE_WRITE,
        Permission.ADMIN_READ,
        Permission.ADMIN_WRITE,
        Permission.ADMIN_DELETE,
        Permission.SYSTEM_HEALTH,
        Permission.SYSTEM_METRICS,
    ]
