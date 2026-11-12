# src/core/exceptions.py
"""Custom exceptions for MedicusCommon."""

class MedicusCommonException(Exception):
    """Base exception for MedicusCommon library."""
    pass

class _DetailedError(MedicusCommonException):
    """An error with a machine-readable code and context, safe to log."""

    def __init__(self, message: str, error_code: str | None = None, details: dict | None = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}


class SecurityError(_DetailedError):
    """Rejected input: path traversal, malicious content, invalid input type."""


class FileOperationError(_DetailedError):
    """A file could not be read or processed."""


class AuthenticationError(MedicusCommonException):
    """Raised when authentication fails."""
    pass

class AuthorizationError(MedicusCommonException):
    """Raised when authorization fails."""
    pass

class UserNotFoundError(MedicusCommonException):
    """Raised when a user is not found."""
    pass

class UserAlreadyExistsError(MedicusCommonException):
    """Raised when trying to create a user that already exists."""
    pass

class InvalidTokenError(MedicusCommonException):
    """Raised when token is invalid or expired."""
    pass

class TokenExpiredError(MedicusCommonException):
    """Raised when token has expired."""
    pass

class AccountLockedError(MedicusCommonException):
    """Raised when account is locked due to too many failed attempts."""
    pass

class ValidationError(MedicusCommonException):
    """Raised when data validation fails."""
    pass

class DatabaseError(MedicusCommonException):
    """Raised when database operations fail."""
    pass



class MedicusConvoError(MedicusCommonException):
    """Base exception for MedicusConvo application-specific errors."""
    pass

class ConversationNotFoundError(MedicusCommonException):
    """Raised when a conversation is not found."""
    pass


# Medicus User Exceptions
class MedicusUserException(MedicusCommonException):
    """Base exception for MedicusUser application-specific errors."""
    
    def __init__(self, message: str, error_code: str = "USER_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
    
    def to_dict(self):
        """Convert exception to dictionary for JSON response."""
        return {
            "error": self.error_code,
            "message": self.message,
            "status_code": self.status_code
        }


def create_http_exception(exc: MedicusUserException):
    """Create HTTPException from MedicusUserException."""
    from fastapi import HTTPException
    return HTTPException(
        status_code=exc.status_code,
        detail=exc.to_dict()
    )
    
# MedicusAI Exceptions
class MedicusAIException(Exception):
    """Base exception for MedicusAI application-specific errors."""
    pass

class ConfigurationError(MedicusAIException):
    """Base exception for MedicusAI application-specific errors."""
    pass

class RedisError(MedicusAIException):
    """Base exception for MedicusAI application-specific errors."""
    pass

class AudioProcessingError(Exception):
    """Raised when audio processing fails."""
    pass

class ImageProcessingError(Exception):
    """Raised when image processing fails."""
    pass

class ProcessingError(Exception):
    """Raised for general processing errors."""
    pass
