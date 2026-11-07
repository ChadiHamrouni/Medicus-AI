# =============================================================================
# src/api/user_routes.py
"""User management API routes - Fixed for Pydantic V2."""

from fastapi import APIRouter, Depends, HTTPException, status

from medicus_common.core.logging_config import get_logger
from medicus_common.core.exceptions import UserNotFoundError, AuthenticationError
from medicus_common.models.user import (
    User,
    UserResponse,
    UserUpdateRequest,
    PasswordChangeRequest
)

from src.services.auth.user_service import UserService
from src.services.auth.auth_service import AuthService
from src.api.auth_routes.auth_login import get_current_user



logger = get_logger(__name__)
router = APIRouter(tags=["users"])

@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information using efficient LoginService."""
    from src.services.auth.login_service import LoginService
    
    try:
        # Use efficient LoginService to get complete user data
        complete_data = await LoginService.get_complete_login_data(current_user.id)
        user_data = complete_data['user']
        
        return UserResponse.model_validate(user_data)
        
    except Exception as e:
        logger.error(f"Failed to get user info with LoginService - error: {str(e)}, user_id: {current_user.id}")
        # Fallback to current_user if LoginService fails
        user_dict = current_user.model_dump()
        user_dict['account_status'] = getattr(current_user, 'status', None)
        return UserResponse.model_validate(user_dict)  


@router.put("/me", response_model=UserResponse)
async def update_current_user(
        user_data: UserUpdateRequest,
        current_user: User = Depends(get_current_user)
):
    """Update current user information."""
    try:
        user_service = UserService()
        updated_user = await user_service.update_user(
            current_user.id,
            user_data.model_dump(exclude_unset=True)
        )
        user_dict = updated_user.model_dump()
        user_dict['account_status'] = getattr(updated_user, 'status', None)
        return UserResponse.model_validate(user_dict)  

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update user - error: {str(e)}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


@router.delete("/me")
async def delete_current_user(current_user: User = Depends(get_current_user)):
    """Delete (deactivate) current user account."""
    try:
        user_service = UserService()
        await user_service.delete_user(current_user.id)
        return {"message": "Account deactivated successfully"}

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete user - error: {str(e)}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )


@router.put("/me/password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user)
):
    """Change current user's password."""
    try:
        # Validate that new password and confirm password match
        password_data.validate_passwords()
        
        auth_service = AuthService()
        success = await auth_service.change_password(
            current_user.id,
            password_data.old_password,
            password_data.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change password"
            )
        
        return {"message": "Password changed successfully"}

    except ValueError as e:
        # Validation error (passwords don't match)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except AuthenticationError as e:
        # Wrong old password
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to change password - error: {str(e)}, user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )


# REMOVED: search endpoint - questionable functionality removed as requested


