# =============================================================================
# src/api/auth_routes/auth_email.verif.py
"""Authentication API routes - Fixed for Pydantic V2."""

from fastapi import APIRouter, HTTPException, status, Request, Depends
from medicus_common.core.logging_config import logger


from medicus_common.models.auth.auth_requests import (
    EmailVerificationRequest,
    EmailVerificationCodeRequest,
)

from medicus_common.models.auth.auth_responses import EmailVerificationResponse
from src.api.auth_routes.auth_dependencies import (
    rate_limit_dependency, email_service, login_service, user_service)

router = APIRouter(tags=["email-verification"])


@router.post("/send-verification-code", response_model=EmailVerificationResponse)
async def send_verification_code(
    request: EmailVerificationRequest, 
    req: Request, 
    _: None = Depends(rate_limit_dependency)
):
    """Send email verification code."""
    try:
        # Check if user exists
        user = await user_service.get_user_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if already verified
        if user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )
        
        # Generate and send verification code
        code = await email_service.generate_verification_code(request.email)

        # Get proper user name from LoginService
        try:
            complete_data = await login_service.get_complete_login_data(user.id)
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

        email_sent = await email_service.send_verification_email(
            request.email, code, user_name
        )
        
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email"
            )
        
        return EmailVerificationResponse(
            message="Verification code sent to your email",
            email=request.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to send verification code", error=str(e), email=request.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code"
        )


@router.post("/verify-email")
async def verify_email_code(
    request: EmailVerificationCodeRequest, 
    req: Request,
    _: None = Depends(rate_limit_dependency)
):
    """Verify email with code."""
    try:
        
        # Verify the code
        is_valid = await email_service.verify_code(
            request.email, request.code, "email_verification"
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code"
            )
        
        return {"message": "Email verified successfully", "email": request.email}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to verify email", error=str(e), email=request.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


