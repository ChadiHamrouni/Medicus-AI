# src/core/__init__.py
"""Core utilities and configuration."""

from medicus_common.core.config import get_settings, Settings
from medicus_common.core.config_ai import Config
from medicus_common.core.database import db_manager, DatabaseManager
from medicus_common.core.logging_config import get_logger, logger
try:
    from medicus_common.core.openai import OpenAIClient
except ImportError:
    OpenAIClient = None
from medicus_common.core.exceptions import (
    MedicusCommonException,
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    DatabaseError,
    InvalidTokenError,
    TokenExpiredError,
    UserNotFoundError,
    UserAlreadyExistsError,
    AccountLockedError,
    ConfigurationError,
)

__all__ = [
    "get_settings",
    "Settings",
    "Config",
    "db_manager",
    "DatabaseManager",
    "get_logger",
    "logger",
    "OpenAIClient",
    "MedicusCommonException",
    "AuthenticationError",
    "AuthorizationError",
    "ValidationError",
    "DatabaseError",
    "InvalidTokenError",
    "TokenExpiredError",
    "UserNotFoundError",
    "UserAlreadyExistsError",
    "AccountLockedError",
    "ConfigurationError",
]