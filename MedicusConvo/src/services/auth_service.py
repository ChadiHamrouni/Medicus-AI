"""JWT authentication for MedicusConvo (tokens are issued by MedicusUser)."""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from medicus_common.core.config import get_settings
from medicus_common.core.logging_config import logger
from medicus_common.models.user.user_core import User, UserRole, UserStatus

security = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid authentication credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def _user_from_token(token: str) -> User:
    """Validate signature, expiry, audience and claims; build a User without a DB round-trip."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience="medicus-api",
            options={"require_exp": True, "require_sub": True},
        )
        user_id = int(payload["sub"])
        role = UserRole(payload.get("role"))
    except (JWTError, KeyError, ValueError, TypeError) as e:
        logger.warning(f"Token verification failed: {type(e).__name__}")
        raise _UNAUTHORIZED

    email = payload.get("email")
    if not email or "@" not in email:
        email = f"user-{user_id}@example.com"
    return User(
        id=user_id,
        email=email,
        password="",
        role=role,
        account_status=UserStatus.ACTIVE,
        signup_step=1,
        is_email_verified=True,
        is_phone_verified=True,
        metadata={},
    )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Bearer token (mobile) or `medicus_access` cookie (web)."""
    token = credentials.credentials if credentials else request.cookies.get("medicus_access")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _user_from_token(token)


async def get_current_user_websocket(token: str) -> User:
    return _user_from_token(token)
