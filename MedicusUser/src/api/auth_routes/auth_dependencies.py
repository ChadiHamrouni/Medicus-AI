# =============================================================================
# src/api/auth_login.py
"""Authentication API routes - Fixed for Pydantic V2."""

from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer
import time
import os
from typing import Dict

from src.services.auth.auth_service import AuthService
from src.services.auth.email_service import EmailService
from src.services.auth.user_service import UserService
from src.services.auth.login_service import LoginService


# Global instances
auth_service = AuthService()
email_service = EmailService()
user_service = UserService()
login_service = LoginService()

security = HTTPBearer()

# In-memory rate limiter
auth_rate_limiter: Dict[str, Dict[str, float]] = {}


AUTH_RATE_LIMIT = int(os.getenv("AUTH_RATE_LIMIT", "10"))
AUTH_RATE_WINDOW_SECONDS = int(os.getenv("AUTH_RATE_WINDOW_SECONDS", "300"))


def check_rate_limit(client_ip: str, endpoint: str, limit: int = AUTH_RATE_LIMIT,
                     window: int = AUTH_RATE_WINDOW_SECONDS) -> bool:
    """
    Per-process fixed-window limiter for authentication endpoints.

    With several replicas, put a shared limiter (reverse proxy or Redis) in front.
    Behind a proxy, run uvicorn with --proxy-headers so client IPs are correct.
    """
    now = time.time()
    key = f"{client_ip}:{endpoint}"

    if key not in auth_rate_limiter:
        auth_rate_limiter[key] = {"count": 1, "window_start": now}
        return True

    # Reset window if expired
    if now - auth_rate_limiter[key]["window_start"] > window:
        auth_rate_limiter[key] = {"count": 1, "window_start": now}
        return True

    # Check if limit exceeded
    if auth_rate_limiter[key]["count"] >= limit:
        return False

    # Increment count
    auth_rate_limiter[key]["count"] += 1
    return True


async def rate_limit_dependency(request: Request):
    """Rate limiting dependency for authentication endpoints."""
    # Check if rate limiting is disabled (for testing)
    if os.getenv("DISABLE_RATE_LIMIT", "false").lower() == "true":
        return

    client_ip = request.client.host if request.client else "unknown"
    endpoint = request.url.path

    if not check_rate_limit(client_ip, endpoint):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": "300"}
        )


