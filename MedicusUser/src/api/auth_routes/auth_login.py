# =============================================================================
# src/api/auth_login.py
"""Authentication API routes - Fixed for Pydantic V2."""

from fastapi import APIRouter, HTTPException, Request, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from medicus_common.models.auth.auth_requests import UserLoginRequest
from medicus_common.models.user import User, UserRole, UserStatus
from src.helpers import authenticate_user, create_tokens, build_login_response, ClientInfo
from src.helpers.cookie_helpers import set_auth_cookies, get_token_from_request
from src.services.auth.login_service import LoginService
from src.api.auth_routes.auth_dependencies import rate_limit_dependency, auth_service
from medicus_common.core.exceptions import AccountLockedError, AuthenticationError
from medicus_common.core.logging_config import logger

router = APIRouter(tags=["login"])
security = HTTPBearer(auto_error=False)



async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    FastAPI dependency: Extract user from JWT token.
    Returns minimal User object for authentication/authorization.
    Does NOT load full profile - use LoginService.get_complete_login_data() for that.

    Args:
        credentials: HTTP Bearer credentials with JWT token

    Returns:
        User: Minimal user object with data from JWT payload only

    Raises:
        HTTPException: If token is invalid, expired, or revoked
    """
    try:
        # Accept token from Bearer header (MediApp) or HTTP-only cookie (MediWeb)
        token = get_token_from_request(request)
        if not token and credentials:
            token = credentials.credentials
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify JWT and extract payload
        payload = await auth_service.verify_token_payload(token)

        # Check if token is blacklisted
        if await auth_service.is_token_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"}
            )

        # Build minimal User from JWT payload (no DB query!)
        user_id = int(payload.get("sub"))
        role_str = payload.get("role")
        email = payload.get("email", "no-email@placeholder.com")  # Use placeholder if missing

        if not user_id or not role_str:
            logger.error(f"Invalid token payload - user_id: {user_id}, role: {role_str}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload - missing user_id or role",
                headers={"WWW-Authenticate": "Bearer"}
            )

        # Create minimal User object from JWT data
        user = User(
            id=user_id,
            role=UserRole(role_str),
            email=email,
            phone_number=None,
            status=UserStatus.ACTIVE,  # Assumed active if JWT is valid
            account_status="active",
            created_at=None,
            updated_at=None,
            deleted_at=None,
            failed_login_attempts=0,
            locked_until=None,
            last_login=None,
            signup_step=1,
            is_email_verified=True,
            is_phone_verified=False,
            password="",
            password_hash="",
            metadata={}
        )
        
        return user

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"ValueError in get_current_user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token data: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


@router.post("/login")
async def login_user(user_data: UserLoginRequest, request: Request, _: None = Depends(rate_limit_dependency)):
    """
    Authenticate a user and return tokens and profile information.
    """
    try:
        client_info = ClientInfo.from_request(request)
        
        user = await authenticate_user(user_data, client_info, auth_service)

        access_token, refresh_token, expires_in = await create_tokens(auth_service, user)

        complete_data = await LoginService.get_complete_login_data(user.id)

        response_data = build_login_response(user, complete_data, access_token, refresh_token, expires_in)

        # Set HTTP-only cookies for MediWeb; MediApp uses JSON body tokens
        response = JSONResponse(content=jsonable_encoder(response_data))
        set_auth_cookies(response, access_token, refresh_token)
        return response

    except HTTPException as e:
        logger.warning(f"Login failed for {user_data.identifier}: {e.detail}")
        raise
    except AccountLockedError:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Account is temporarily locked")
    except AuthenticationError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    except Exception as e:
        logger.error(f"Login error for {user_data.identifier}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed")

