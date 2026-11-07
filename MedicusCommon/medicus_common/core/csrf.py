"""
Double-submit-cookie CSRF protection for cookie-authenticated (browser) sessions.

Login sets a JS-readable `medicus_csrf` cookie; the web client echoes it in the
`X-CSRF-Token` header on state-changing requests. Requests that authenticate
with an explicit Bearer token, or carry no session cookie at all, are not
exposed to CSRF and pass through.
"""

import json
import secrets

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from medicus_common.core.config import get_settings
from medicus_common.core.logging_config import logger

CSRF_COOKIE_NAME = "medicus_csrf"
CSRF_HEADER_NAME = "x-csrf-token"
SESSION_COOKIE_NAMES = ("medicus_access", "medicus_refresh")
PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# Endpoints reachable before a session (and its CSRF cookie) exists.
DEFAULT_EXEMPT_PATHS = frozenset({
    "/api/MedicusUser/auth/login",
    "/api/MedicusUser/auth/register",
    "/api/MedicusUser/auth/send-verification-code",
    "/api/MedicusUser/auth/verify-email",
    "/api/MedicusUser/auth/request-password-reset",
    "/api/MedicusUser/auth/reset-password",
})

# Endpoints that accept the refresh token in the JSON body. When the body carries it,
# the request is authenticated by an explicit credential (what native/mobile clients
# do), not by an ambient cookie, so CSRF does not apply.
BODY_TOKEN_PATHS = frozenset({
    "/api/MedicusUser/auth/refresh",
    "/api/MedicusUser/auth/logout",
})


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def _cookie_policy() -> tuple[bool, str]:
    production = get_settings().is_production
    # SameSite=None (cross-site web client) requires Secure, i.e. HTTPS.
    return production, ("none" if production else "lax")


def set_csrf_cookie(response: Response, token: str) -> None:
    secure, same_site = _cookie_policy()
    response.set_cookie(key=CSRF_COOKIE_NAME, value=token, httponly=False, secure=secure,
                        samesite=same_site, max_age=86400, path="/")


def clear_csrf_cookie(response: Response) -> None:
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")


class CSRFMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, exempt_paths: frozenset[str] = DEFAULT_EXEMPT_PATHS):
        super().__init__(app)
        self.exempt_paths = exempt_paths

    async def dispatch(self, request: Request, call_next):
        if (
            request.method not in PROTECTED_METHODS
            or request.url.path in self.exempt_paths
            or request.headers.get("authorization", "").lower().startswith("bearer ")
            or not any(name in request.cookies for name in SESSION_COOKIE_NAMES)
        ):
            return await call_next(request)

        if request.url.path in BODY_TOKEN_PATHS and await _has_body_refresh_token(request):
            return await call_next(request)

        cookie = request.cookies.get(CSRF_COOKIE_NAME)
        header = request.headers.get(CSRF_HEADER_NAME)
        if not cookie or not header or not secrets.compare_digest(cookie, header):
            logger.warning(f"CSRF validation failed: {request.method} {request.url.path}")
            return JSONResponse(status_code=403, content={"detail": "CSRF token missing or invalid"})
        return await call_next(request)


async def _has_body_refresh_token(request: Request) -> bool:
    try:
        body = await request.body()  # cached by Starlette and replayed to the route
        data = json.loads(body) if body else None
    except (ValueError, UnicodeDecodeError):
        return False
    return isinstance(data, dict) and isinstance(data.get("refresh_token"), str) and bool(data["refresh_token"])
