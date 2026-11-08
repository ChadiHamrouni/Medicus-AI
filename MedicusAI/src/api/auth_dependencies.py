"""
JWT authentication dependency for MedicusAI endpoints.

Decodes the same JWT issued by MedicusUser (HS256, aud="medicus-api").
All protected endpoints add:  current_user: User = Depends(get_current_user)
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from medicus_common.core.config import get_settings
from medicus_common.core.logging_config import logger
from medicus_common.models.user.user_core import User, UserRole, UserStatus

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    token = None
    if credentials:
        token = credentials.credentials
    elif "medicus_access" in request.cookies:
        token = request.cookies["medicus_access"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_from_token(token)


def user_from_token(token: str) -> User:
    """Validate a MedicusUser access token and return its user (HTTPException 401 if invalid).
    Shared by HTTP endpoints and the live-voice WebSocket."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience="medicus-api",
        )
    except JWTError as e:
        logger.warning(f"[AUTH] JWT decode failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    role_str = payload.get("role")
    email = payload.get("email", "unknown@medicus.com")

    if not user_id_str or not role_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        role = UserRole(role_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unknown role in token: {role_str}",
        )

    return User(
        id=int(user_id_str),
        email=email,
        password="",
        role=role,
        account_status=UserStatus.ACTIVE,
        signup_step=1,
        is_email_verified=True,
        is_phone_verified=True,
        metadata={},
    )
