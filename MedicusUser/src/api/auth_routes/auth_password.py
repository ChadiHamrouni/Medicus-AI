# =============================================================================
# src/api/auth_login.py
"""Authentication API routes - Fixed for Pydantic V2."""

from fastapi import APIRouter, HTTPException, Request, Depends, status
from medicus_common.models.auth.auth_requests import PasswordResetRequest, PasswordResetCodeRequest
from medicus_common.models.auth.auth_responses import PasswordResetResponse
from medicus_common.core.logging_config import logger
from src.api.auth_routes.auth_dependencies import rate_limit_dependency, auth_service, email_service
from src.services.auth.user_service import UserService
from src.services.auth.login_service import LoginService

router = APIRouter(tags=["password"])

@router.post("/request-password-reset", response_model=PasswordResetResponse)
async def request_password_reset(
    request: PasswordResetRequest, 
    req: Request,
    _: None = Depends(rate_limit_dependency)
):
    """Request password reset code."""
    try:
        # Check if user exists
        user = await UserService.get_user_by_email(request.email)
        if not user:
            # For security, don't reveal if email exists
            return PasswordResetResponse(
                message="If your email is registered, you will receive a password reset code",
                email=request.email
            )
        
        # Generate and send password reset code
        code = await email_service.generate_verification_code(
            request.email, "password_reset"
        )

        # Get proper user name from LoginService
        try:
            complete_data = await LoginService.get_complete_login_data(user.id)
            user_data = complete_data.get('user', {})
            patient_data = complete_data.get('patient')
            doctor_data = complete_data.get('doctor')

            # Extract name based on role
            user_name = None
            if patient_data:
                user_name = f"{patient_data.get('first_name', '')} {patient_data.get('last_name', '')}".strip()
            elif doctor_data:
                user_name = f"{doctor_data.get('first_name', '')} {doctor_data.get('last_name', '')}".strip()

            # Fallback to email username if no name found
            if not user_name:
                user_name = str(request.email).split('@')[0]
        except Exception:
            # Fallback to email username on any error
            user_name = str(request.email).split('@')[0]

        email_sent = await email_service.send_password_reset_email(
            request.email, code, user_name
        )
        
        # Always return success for security
        return PasswordResetResponse(
            message="If your email is registered, you will receive a password reset code",
            email=request.email
        )
        
    except Exception as e:
        logger.error("Failed to send password reset code", error=str(e), email=request.email)
        # Return success even on error for security
        return PasswordResetResponse(
            message="If your email is registered, you will receive a password reset code",
            email=request.email
        )


@router.post("/reset-password")
async def reset_password_with_code(
    request: PasswordResetCodeRequest, 
    req: Request,
    _: None = Depends(rate_limit_dependency)
):
    """Reset password with verification code."""
    try:
        # Verify the code
        is_valid = await email_service.verify_code(
            request.email, request.code, "password_reset"
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset code"
            )
        
        # Get user
        user = await UserService.get_user_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Reset password using auth service
        success = await auth_service.reset_password(user.id, request.new_password)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset password"
            )
        
        return {
            "message": "Password reset successfully", 
            "email": request.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to reset password", error=str(e), email=request.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )