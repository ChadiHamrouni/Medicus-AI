"""
Authentication for MedicusNotification.

  * get_current_user  - end users (JWT issued by MedicusUser): devices, preferences.
  * require_internal  - other Medicus services (X-Internal-Key): creating
                        notifications, publishing events, reading delivery status.
"""

import hmac
import os

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from medicus_common.core.config import get_settings
from medicus_common.core.logging_config import logger

security = HTTPBearer(auto_error=False)
_internal_key = APIKeyHeader(name="X-Internal-Key", auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"})
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience="medicus-api",
            options={"require_exp": True, "require_sub": True},
        )
        return {"user_id": int(payload["sub"]), "role": payload.get("role"), "email": payload.get("email")}
    except (JWTError, KeyError, ValueError, TypeError) as e:
        logger.warning(f"Token validation failed: {type(e).__name__}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})


async def require_internal(key: str = Security(_internal_key)) -> None:
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or expected.upper().startswith("CHANGE_ME"):
        logger.error("INTERNAL_API_KEY is not set (or still the placeholder); rejecting internal API call")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service misconfigured")
    if not key or not hmac.compare_digest(key.encode(), expected.encode()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
