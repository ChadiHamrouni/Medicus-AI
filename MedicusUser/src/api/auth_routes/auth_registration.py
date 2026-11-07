# =============================================================================
# src/api/auth_login.py
"""Authentication API routes - Fixed for Pydantic V2."""

from fastapi import APIRouter, HTTPException, status, Request, Depends
from medicus_common.models.user.user_requests import UserRegisterRequest
from medicus_common.models.user.user_responses import UserResponse
from medicus_common.models.auth.auth_responses import TokenResponse
from medicus_common.core.exceptions import UserAlreadyExistsError, DatabaseError
from src.api.auth_routes.auth_dependencies import rate_limit_dependency, auth_service
from src.services.auth.user_service import UserService

router = APIRouter(tags=["registration"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegisterRequest, request: Request, _: None = Depends(rate_limit_dependency)):
    """
    Register a new user and return access/refresh tokens.
    """
    try:
        user_service = UserService()
        user = await user_service.create_user(user_data.model_dump())
        access_token, refresh_token = await auth_service.create_tokens(user)
        expires_in = auth_service.settings.jwt_access_token_expire_minutes * 60

        user_dict = user.model_dump()
        user_dict['account_status'] = getattr(user, 'status', None)
        user_dict['signup_step'] = getattr(user, 'signup_step', None)
        user_dict['is_email_verified'] = getattr(user, 'is_email_verified', None)
        user_dict['is_phone_verified'] = getattr(user, 'is_phone_verified', False)

        user_response = UserResponse.model_validate(user_dict)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            user=user_response
        )

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except DatabaseError as e:
        # Check if this is a wrapped UserAlreadyExistsError
        error_str = str(e)
        if "User with phone" in error_str and "already exists" in error_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_str.replace("Database operation failed: ", "")
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again later."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again later."
        )
