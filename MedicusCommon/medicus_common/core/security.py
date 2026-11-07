# src/core/security.py
"""Security utilities and middleware for production."""

import base64
import hashlib
import hmac
import secrets
import time
from typing import Optional, Dict, Any
from datetime import datetime
import json 
import os

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
from cryptography.fernet import Fernet

from medicus_common.core.config import get_settings
from medicus_common.core.logging_config import get_logger, log_audit_event

logger = get_logger(__name__)


class RateLimiter:
    """Redis-based rate limiter for API endpoints."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def is_allowed(
            self,
            key: str,
            limit: int,
            window: int = 60
    ) -> tuple[bool, int]:
        """Check if request is allowed under rate limit.

        Args:
            key: Unique identifier (IP, user_id, etc.)
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        pipe = self.redis.pipeline()
        now = time.time()
        window_start = now - window

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        # Add current request
        pipe.zadd(key, {str(now): now})
        # Count requests in window
        pipe.zcard(key)
        # Set expiry
        pipe.expire(key, window + 1)

        results = await pipe.execute()
        request_count = results[2]

        if request_count > limit:
            return False, 0

        return True, limit - request_count


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Remove server header
        response.headers.pop("server", None)

        # CSP header
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.medicusregistry.com"
        )
        response.headers["Content-Security-Policy"] = csp

        return response


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """IP whitelist middleware for admin endpoints."""

    def __init__(self, app, whitelist: list[str] = None):
        super().__init__(app)
        self.whitelist = whitelist or []

    async def dispatch(self, request: Request, call_next):
        # Only check for admin routes
        if request.url.path.startswith("/admin"):
            client_ip = request.client.host
            if self.whitelist and client_ip not in self.whitelist:
                logger.warning(f"Blocked admin access from IP: {client_ip}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

        return await call_next(request)


class APIKeyValidator:
    """Validate API keys for service-to-service communication."""

    def __init__(self):
        self.settings = get_settings()

    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Validate API key and return associated metadata."""
        # In production, this would check against database or cache
        # For now, using a simple hash comparison

        if not api_key:
            return None

        # Example implementation
        expected_hash = hashlib.sha256(
            f"{self.settings.jwt_secret_key}:{api_key}".encode()
        ).hexdigest()

        # This would be replaced with actual database lookup
        valid_keys = {
            "mobile_app_key": {
                "client": "mobile_app",
                "scopes": ["read:patients", "write:patients"],
                "rate_limit": 1000
            },
            "web_app_key": {
                "client": "web_app",
                "scopes": ["read:all", "write:all"],
                "rate_limit": 5000
            }
        }

        for key_name, metadata in valid_keys.items():
            if secrets.compare_digest(api_key, key_name):
                return metadata

        return None


class DataEncryption:
    """Encrypt sensitive data at rest."""

    def __init__(self):
        settings = get_settings()
        # Generate encryption key from secret
        key = hashlib.sha256(settings.jwt_secret_key.encode()).digest()
        # Use the derived key for encryption (Fix critical bug)
        self.cipher = Fernet(base64.urlsafe_b64encode(key))

    def encrypt(self, data: str) -> str:
        """Encrypt sensitive data."""
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data."""
        return self.cipher.decrypt(encrypted_data.encode()).decode()


class SecurityUtils:
    """Additional security utilities."""

    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure random token."""
        return secrets.token_urlsafe(length)

    @staticmethod
    def hash_password_reset_token(email: str, timestamp: int) -> str:
        """Generate password reset token."""
        settings = get_settings()
        data = f"{email}:{timestamp}:{settings.jwt_secret_key}"
        return hashlib.sha256(data.encode()).hexdigest()

    @staticmethod
    def verify_webhook_signature(
            payload: bytes,
            signature: str,
            secret: str
    ) -> bool:
        """Verify webhook signature for third-party integrations."""
        expected_signature = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return secrets.compare_digest(signature, expected_signature)

    @staticmethod
    def sanitize_user_input(input_string: str) -> str:
        """Sanitize user input to prevent XSS."""
        # Basic sanitization - in production use a proper library
        dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
        sanitized = input_string

        for char in dangerous_chars:
            sanitized = sanitized.replace(char, '')

        return sanitized.strip()

    @staticmethod
    def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive fields in logs."""
        sensitive_fields = [
            'password', 'token', 'secret', 'api_key',
            'credit_card', 'ssn', 'wa_number'
        ]

        masked_data = data.copy()

        for key, value in masked_data.items():
            if any(field in key.lower() for field in sensitive_fields):
                if isinstance(value, str) and len(value) > 4:
                    masked_data[key] = value[:2] + '*' * (len(value) - 4) + value[-2:]
                else:
                    masked_data[key] = '***'

        return masked_data


class JWTBearer(HTTPBearer):
    """Custom JWT Bearer for additional validation."""

    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[HTTPAuthorizationCredentials]:
        credentials = await super().__call__(request)

        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid authentication scheme"
                )

            # Additional token validation can be added here
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid or expired token"
                )

            return credentials.credentials

        return None

    def verify_jwt(self, token: str) -> bool:
        """Verify JWT token structure."""
        # Basic validation - actual verification done in auth service
        parts = token.split('.')
        return len(parts) == 3


# Session security
class SessionSecurity:
    """Handle session security and CSRF protection."""

    @staticmethod
    def generate_csrf_token() -> str:
        """Generate CSRF token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def verify_csrf_token(request_token: str, session_token: str) -> bool:
        """Verify CSRF token."""
        return secrets.compare_digest(request_token, session_token)

    @staticmethod
    async def create_secure_session(
            user_id: int,
            redis_client: redis.Redis,
            ttl: int = 3600
    ) -> str:
        """Create secure session with Redis."""
        session_id = secrets.token_urlsafe(32)
        session_data = {
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'csrf_token': SecurityUtils.generate_secure_token()
        }

        await redis_client.setex(
            f"session:{session_id}",
            ttl,
            json.dumps(session_data)
        )

        return session_id


# SQL Injection prevention
def sanitize_sql_param(param: Any) -> Any:
    """Sanitize parameters for SQL queries."""
    if isinstance(param, str):
        # Remove potential SQL injection characters
        dangerous_patterns = [';', '--', '/*', '*/', 'xp_', 'sp_']
        sanitized = param
        for pattern in dangerous_patterns:
            sanitized = sanitized.replace(pattern, '')
        return sanitized
    return param


# File upload security
class FileUploadSecurity:
    """Secure file upload handling."""

    ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    @classmethod
    def validate_file(cls, filename: str, file_content: bytes) -> tuple[bool, str]:
        """Validate uploaded file."""
        # Check file extension
        ext = os.path.splitext(filename)[1].lower()
        if ext not in cls.ALLOWED_EXTENSIONS:
            return False, "File type not allowed"

        # Check file size
        if len(file_content) > cls.MAX_FILE_SIZE:
            return False, "File too large"

        # Check file content matches extension
        # In production, use python-magic or similar

        return True, "Valid"

    @staticmethod
    def generate_safe_filename(original_filename: str) -> str:
        """Generate safe filename."""
        name = secrets.token_urlsafe(16)
        ext = os.path.splitext(original_filename)[1].lower()
        return f"{name}{ext}"


# Audit logging for security events
async def log_security_event(
        event_type: str,
        severity: str,
        user_id: Optional[int],
        ip_address: str,
        details: Dict[str, Any]
):
    """Log security-related events."""
    log_audit_event(
        event_type=f"security.{event_type}",
        user_id=user_id or 0,
        resource_type="security",
        resource_id=ip_address,
        action=event_type,
        result=severity,
        metadata={
            'ip_address': ip_address,
            'timestamp': datetime.utcnow().isoformat(),
            'details': SecurityUtils.mask_sensitive_data(details)
        }
    )