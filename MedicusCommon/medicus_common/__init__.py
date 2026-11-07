"""
MedicusCommon - Shared utilities and components for Medicus microservices.

This package provides common functionality for authentication, database access,
configuration management, and other shared utilities across the Medicus platform.
"""

__version__ = "1.0.1"
__author__ = "Medicus Team"
__email__ = "dev@medicus.com"

# Core imports for easy access
from medicus_common.core.config import get_settings, Settings
from medicus_common.core.database import db_manager, DatabaseManager
from medicus_common.core.exceptions import (
    MedicusCommonException,
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    DatabaseError,
    InvalidTokenError,
    TokenExpiredError,
)



# Auth utilities
from medicus_common.auth.password import (
    hash_password,
    verify_password,
    generate_password,
    is_password_strong,
)
from medicus_common.auth.jwt_handler import JWTHandler, TokenPayload

# Common models
from medicus_common.models.base import (
    BaseResponseModel,
    CommonModel,
    UUIDModel,
    PaginationParams,
    PaginatedResponse,
    DatabaseRecord,
)

# Service classes
from medicus_common.services.common_services import CommonServices

__all__ = [
    # Version info
    "__version__",
    "__author__",
    "__email__",
    
    # Core
    "get_settings",
    "Settings",
    "db_manager",
    "DatabaseManager",
    
    # Exceptions
    "MedicusCommonException",
    "AuthenticationError", 
    "AuthorizationError",
    "ValidationError",
    "DatabaseError",
    "InvalidTokenError",
    "TokenExpiredError",
    
    # Auth
    "hash_password",
    "verify_password", 
    "generate_password",
    "is_password_strong",
    "JWTHandler",
    "TokenPayload",
    
    # Models
    "BaseResponseModel",
    "CommonModel",
    "UUIDModel", 
    "PaginationParams",
    "PaginatedResponse",
    "DatabaseRecord",
    
    # Services
    "CommonServices",
]