# src/helpers/cookie_helpers.py
"""HTTP-only secure cookie helpers for MediWeb sessions."""

from fastapi import Response, Request
from medicus_common.core.config import get_settings
from medicus_common.core.csrf import (
    generate_csrf_token,
    set_csrf_cookie,
    clear_csrf_cookie,
)


# Cookie names
ACCESS_COOKIE = "medicus_access"
REFRESH_COOKIE = "medicus_refresh"


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> None:
    """
    Set HTTP-only, Secure, SameSite=None auth cookies on the response.

    SameSite=None is required for cross-origin cookie sharing between
    MediWeb (frontend domain) and MedicusUser (API domain). SameSite=Strict
    would silently block cookies on cross-origin requests even with CORS
    and credentials: 'include' configured correctly.

    These cookies are opaque to JavaScript — immune to XSS token theft.
    MediWeb sends them automatically via ``credentials: 'include'``.
    MediApp ignores cookies and uses the JSON body tokens instead.
    """
    settings = get_settings()
    secure = settings.is_production
    # SameSite=None requires Secure=True (HTTPS). For development (HTTP),
    # fall back to "lax" since "none" without Secure is rejected by browsers.
    same_site = "none" if settings.is_production else "lax"

    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=same_site,
        max_age=settings.jwt_access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=same_site,
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/api/MedicusUser/auth",  # Refresh cookie only sent to /auth/* routes
    )

    # Set CSRF token cookie (readable by JavaScript for header submission)
    csrf_token = generate_csrf_token()
    set_csrf_cookie(response, csrf_token)


def clear_auth_cookies(response: Response) -> None:
    """Clear auth cookies on logout."""
    response.delete_cookie(key=ACCESS_COOKIE, path="/")
    response.delete_cookie(key=REFRESH_COOKIE, path="/api/MedicusUser/auth")
    clear_csrf_cookie(response)


def get_token_from_request(request: Request) -> str | None:
    """
    Extract the access token from either the Authorization header (MediApp)
    or the HTTP-only cookie (MediWeb). Header takes precedence.
    """
    # 1. Check Authorization header first (Bearer token from MediApp)
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]

    # 2. Fall back to HTTP-only cookie (MediWeb)
    return request.cookies.get(ACCESS_COOKIE)


def get_refresh_token_from_request(request: Request) -> str | None:
    """Extract the refresh token from either JSON body or cookie."""
    return request.cookies.get(REFRESH_COOKIE)