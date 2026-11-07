# src/api/support_routes.py
"""
Owner-Authorized Diagnostic Access Routes.

These endpoints implement the "Debug Handshake" workflow:
  1. Engineer requests diagnostic access for a patient
  2. Backend triggers push notification to the patient's device
  3. Patient approves via biometrics → MediApp signs a JWT
  4. Patient's device POSTs the signed JWT to /authorize
  5. Backend verifies signature, creates time-bound Redis grant
  6. Engineer can access specific records within the grant window

All diagnostic access is logged as HIGH_SEVERITY audit events.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from typing import Optional
import redis.asyncio as redis

from medicus_common.security.diagnostic import (
    DiagnosticVerifier,
    SupportRequest,
    SupportAuthorization,
    DiagnosticGrant,
)
from medicus_common.core.logging_config import get_logger, log_audit_event
from medicus_common.core.config import get_settings
from medicus_common.models.user import User
from src.api.auth_routes.auth_login import get_current_user

logger = get_logger(__name__)
router = APIRouter(prefix="/support", tags=["diagnostic"])

# Redis client — initialized lazily
_redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Get or create the Redis client for diagnostic grants."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def get_diagnostic_verifier() -> DiagnosticVerifier:
    """Dependency: get a DiagnosticVerifier instance."""
    redis_client = await get_redis()
    return DiagnosticVerifier(redis_client)


# ---------------------------------------------------------------------------
# Request/Response Models
# ---------------------------------------------------------------------------

class SupportRequestPayload(BaseModel):
    """Engineer's request for diagnostic access."""
    patient_id: str
    reason: str


class SupportRequestResponse(BaseModel):
    """Response after initiating a support request."""
    request_id: str
    message: str


class SupportAuthorizePayload(BaseModel):
    """Patient's signed consent JWT from the Secure Enclave."""
    signed_jwt: str


class SupportAuthorizeResponse(BaseModel):
    """Response after authorization is verified."""
    session_id: str
    expires_at: str
    message: str


class SupportRecordRequest(BaseModel):
    """Engineer's request to access a specific record."""
    session_id: str
    record_id: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/request", response_model=SupportRequestResponse)
async def request_diagnostic_access(
    payload: SupportRequestPayload,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Engineer requests diagnostic access for a specific patient.

    This endpoint:
      1. Validates the request
      2. Logs the request as a HIGH_SEVERITY audit event
      3. Triggers a push notification to the patient's device
      4. Returns a request_id for tracking

    The patient must approve via biometrics and POST to /authorize.
    """
    # Only engineers/admins can request diagnostic access
    if current_user.role.value not in ("admin", "engineer", "support"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized support staff can request diagnostic access",
        )

    # Log the request as HIGH_SEVERITY
    log_audit_event(
        event_type="diagnostic.request",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=payload.patient_id,
        action="diagnostic_request",
        result="initiated",
        metadata={
            "reason": payload.reason,
            "engineer_id": str(current_user.id),
            "client_ip": request.client.host if request.client else "unknown",
        },
    )

    logger.info(
        "Diagnostic access requested: engineer=%s patient=%s reason=%s",
        current_user.id,
        payload.patient_id,
        payload.reason,
    )

    # TODO: Trigger push notification to patient's device
    # This would integrate with your push notification service (FCM/APNS)
    # For now, we return a request_id that the patient flow can reference

    import uuid
    request_id = str(uuid.uuid4())

    return SupportRequestResponse(
        request_id=request_id,
        message="Diagnostic access request sent. Awaiting patient authorization.",
    )


@router.post("/authorize", response_model=SupportAuthorizeResponse)
async def authorize_diagnostic_access(
    payload: SupportAuthorizePayload,
    request: Request,
    verifier: DiagnosticVerifier = Depends(get_diagnostic_verifier),
):
    """
    Patient authorizes diagnostic access by submitting a signed JWT.

    This endpoint:
      1. Verifies the JWT signature against the patient's registered public key
      2. Creates a time-bound Redis grant (60 minutes)
      3. Logs the authorization as a HIGH_SEVERITY audit event
      4. Returns the session_id for the engineer to use

    The JWT must be signed by the patient's Secure Enclave key and contain:
      - engineer_id: The ID of the engineer requesting access
      - patient_id: The patient's ID
      - exp: Expiration timestamp
    """
    try:
        # TODO: Look up the patient's registered public key from the database
        # For now, we expect the public key to be embedded or fetched separately
        # This is a placeholder — you'll need to implement key registration

        # Example: Fetch from database
        # patient_public_key = await get_patient_public_key(patient_id)

        # For now, raise an error indicating key registration is not yet implemented
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Patient public key registration not yet implemented. "
                   "Register public keys via /auth/register-device-key first.",
        )

        # Once implemented, the flow would be:
        # payload_data = await verifier.verify_owner_signature(
        #     payload.signed_jwt,
        #     patient_public_key,
        # )
        #
        # grant = await verifier.create_grant(
        #     engineer_id=payload_data["engineer_id"],
        #     patient_id=payload_data["patient_id"],
        #     owner_public_key_id=key_id,
        # )
        #
        # log_audit_event(...)
        #
        # return SupportAuthorizeResponse(
        #     session_id=grant.session_id,
        #     expires_at=grant.expires_at.isoformat(),
        #     message="Diagnostic access granted.",
        # )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Diagnostic authorization failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authorization token",
        )


@router.post("/revoke")
async def revoke_diagnostic_access(
    session_id: str,
    current_user: User = Depends(get_current_user),
    verifier: DiagnosticVerifier = Depends(get_diagnostic_verifier),
):
    """
    Revoke a diagnostic grant before it expires.

    Can be called by the patient or an admin.
    """
    await verifier.revoke_grant(session_id)

    log_audit_event(
        event_type="diagnostic.revoke",
        user_id=current_user.id,
        resource_type="diagnostic_grant",
        resource_id=session_id,
        action="revoke",
        result="success",
        metadata={},
    )

    logger.info(
        "Diagnostic grant revoked: session=%s by user=%s",
        session_id,
        current_user.id,
    )

    return {"message": "Diagnostic access revoked"}


@router.get("/check/{session_id}")
async def check_diagnostic_grant(
    session_id: str,
    record_patient_id: str,
    current_user: User = Depends(get_current_user),
    verifier: DiagnosticVerifier = Depends(get_diagnostic_verifier),
):
    """
    Check if a diagnostic grant is valid for the specified patient record.

    Used internally before decrypting PHI in support mode.
    """
    is_valid = await verifier.check_grant(
        session_id=session_id,
        engineer_id=str(current_user.id),
        record_patient_id=record_patient_id,
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No valid diagnostic grant for this record",
        )

    return {"valid": True, "session_id": session_id}