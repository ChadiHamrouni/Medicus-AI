# =============================================================================
# src/api/auth_login.py
"""Authentication API routes - Fixed for Pydantic V2."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from medicus_common.core.exceptions import InvalidTokenError
from medicus_common.models.auth.auth_responses import TokenResponse
from medicus_common.models.auth.auth_requests import RefreshTokenRequest

from medicus_common.models import UserResponse

from src.services.auth.auth_service import AuthService
from src.services.auth.user_service import UserService
from src.helpers.cookie_helpers import (
    set_auth_cookies, clear_auth_cookies, get_refresh_token_from_request,
)
from src.api.auth_routes.auth_dependencies import rate_limit_dependency
from medicus_common.core.logging_config import get_logger

router = APIRouter(tags=["tokens"])
security = HTTPBearer(auto_error=False)
logger = get_logger("auth_tokens")



@router.post("/refresh")
async def refresh_token(
    request: Request,
    token_data: RefreshTokenRequest = None,
    _: None = Depends(rate_limit_dependency),
):
    """Refresh access token. Accepts refresh token from JSON body (MediApp) or cookie (MediWeb)."""
    logger.info("Token refresh attempt")
    try:
        auth_service = AuthService()

        # Get refresh token from body (MediApp) or cookie (MediWeb)
        raw_refresh = (
            token_data.refresh_token if token_data and token_data.refresh_token
            else get_refresh_token_from_request(request)
        )
        if not raw_refresh:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No refresh token provided"
            )

        # Refresh tokens - this should return user info as well
        access_token, new_refresh_token, user_id = await auth_service.refresh_access_token(
            raw_refresh
        )

        # Calculate token expiration
        expires_in = auth_service.settings.jwt_access_token_expire_minutes * 60

        # Get user data
        user_data = await UserService.get_connected_user(user_id)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Convert user_data to response model (only auth.users table fields)
        user_dict = {
            'id': user_data['id'],
            'email': user_data['email'],
            'account_status': user_data['account_status'],
            'phone_number': user_data.get('phone_number'),
            'role': user_data['role'],
            'signup_step': user_data['signup_step'],
            'is_email_verified': user_data['is_email_verified'],
            'is_phone_verified': user_data.get('is_phone_verified', False),
            'created_at': user_data['created_at'],
            'last_login': user_data.get('last_login')
        }

        # Token refresh should NOT call LoginService - client should cache profile data from login
        # Names are not in auth.users table and UserResponse model doesn't include them
        
        # Handle None email field - UserResponse model requires valid string
        if user_dict.get('email') is None:
            user_dict['email'] = ""  # Set to empty string instead of None
            
        user_response = UserResponse.model_validate(user_dict)

        logger.info(f"Token refresh successful for user ID: {user_id}")
        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
            user=user_response,
        )
        response = JSONResponse(content=token_response.model_dump(mode="json"))
        set_auth_cookies(response, access_token, new_refresh_token)
        return response

    except InvalidTokenError as e:
        logger.warning(f"Token refresh failed - invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout_user(
    request: Request,
    token_data: RefreshTokenRequest = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Revoke the access token and the refresh token (body or cookie), then clear cookies."""
    auth_service = AuthService()
    try:
        token = credentials.credentials if credentials else request.cookies.get("medicus_access")
        if token:
            await auth_service.revoke_token(token)
        raw_refresh = (
            token_data.refresh_token if token_data and token_data.refresh_token
            else get_refresh_token_from_request(request)
        )
        if raw_refresh:
            await auth_service.revoke_refresh_token_value(raw_refresh)
    except Exception as e:
        logger.warning(f"Logout token revocation failed: {str(e)}")

    response = JSONResponse(content={"message": "Logged out successfully"})
    clear_auth_cookies(response)
    return response


