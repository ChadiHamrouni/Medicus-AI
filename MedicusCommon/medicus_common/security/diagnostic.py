# medicus_common/security/diagnostic.py
"""
Owner-Authorized Diagnostic Mode — Zero-Visibility Debugging.

The backend has NO standing ability to decrypt PHI. Decryption for support
purposes requires a live, time-bound grant backed by the patient's
hardware-signed consent token (ES256 from Secure Enclave).

Flow:
  1. Engineer requests diagnostic access for a patient
  2. Patient receives push notification → approves via biometrics
  3. MediApp signs a JWT with the device's Secure Enclave key
  4. Backend verifies signature, creates a Redis-backed time-bound grant
  5. Engineer can decrypt specific records within the grant window
  6. Every access is logged as HIGH_SEVERITY audit event
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt as pyjwt
from pydantic import BaseModel
from redis.asyncio import Redis

from medicus_common.core.logging_config import get_logger

logger = get_logger(__name__)

# Redis key prefix for diagnostic grants
_GRANT_PREFIX = "diagnostic:grant:"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class SupportRequest(BaseModel):
    """Engineer's request for diagnostic access."""
    patient_id: str
    reason: str


class SupportAuthorization(BaseModel):
    """Signed consent from the patient's hardware enclave."""
    signed_jwt: str


class DiagnosticGrant(BaseModel):
    """Time-bound decryption grant stored in Redis."""
    session_id: str
    engineer_id: str
    patient_id: str
    expires_at: datetime
    owner_public_key_id: str


# ---------------------------------------------------------------------------
# Verifier
# ---------------------------------------------------------------------------

class DiagnosticVerifier:
    """
    Verifies owner-signed delegation tokens and manages time-bound
    decryption grants in Redis.
    """

    GRANT_TTL_MINUTES: int = 60
    SIGNATURE_ALGORITHM: str = "ES256"  # ECDSA P-256 — Secure Enclave output

    def __init__(self, redis_client: Redis):
        self._redis = redis_client

    async def verify_owner_signature(
        self,
        signed_jwt: str,
        owner_public_key_pem: bytes,
    ) -> dict:
        """
        Decode and verify the JWT signed by the owner's Secure Enclave key.

        Required claims: ``engineer_id``, ``patient_id``, ``exp``.
        Raises ``pyjwt.InvalidTokenError`` on any verification failure.
        """
        payload = pyjwt.decode(
            signed_jwt,
            key=owner_public_key_pem,
            algorithms=[self.SIGNATURE_ALGORITHM],
            options={"require": ["engineer_id", "patient_id", "exp"]},
        )
        logger.info(
            "Owner signature verified for patient=%s engineer=%s",
            payload.get("patient_id"),
            payload.get("engineer_id"),
        )
        return payload

    async def create_grant(
        self,
        engineer_id: str,
        patient_id: str,
        owner_public_key_id: str,
    ) -> DiagnosticGrant:
        """
        Create a time-bound decryption grant and store it in Redis.

        The grant is the ONLY artifact that authorizes the encryptor
        to call ``unwrap_key`` for this patient's records.
        """
        session_id = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.GRANT_TTL_MINUTES)

        grant = DiagnosticGrant(
            session_id=session_id,
            engineer_id=engineer_id,
            patient_id=patient_id,
            expires_at=expires_at,
            owner_public_key_id=owner_public_key_id,
        )

        redis_key = f"{_GRANT_PREFIX}{session_id}"
        await self._redis.set(
            redis_key,
            grant.model_dump_json(),
            ex=self.GRANT_TTL_MINUTES * 60,
        )

        logger.info(
            "Diagnostic grant created: session=%s engineer=%s patient=%s ttl=%dm",
            session_id, engineer_id, patient_id, self.GRANT_TTL_MINUTES,
        )
        return grant

    async def check_grant(
        self,
        session_id: str,
        engineer_id: str,
        record_patient_id: str,
    ) -> bool:
        """
        Validate that a live grant exists and matches the request.

        Returns True only if:
          - Grant exists in Redis (not expired)
          - engineer_id matches the grant
          - The record belongs to the granted patient_id
        """
        redis_key = f"{_GRANT_PREFIX}{session_id}"
        raw = await self._redis.get(redis_key)
        if raw is None:
            logger.warning("Diagnostic grant not found or expired: session=%s", session_id)
            return False

        grant = DiagnosticGrant.model_validate_json(raw)

        if grant.engineer_id != engineer_id:
            logger.warning(
                "Diagnostic grant engineer mismatch: expected=%s got=%s",
                grant.engineer_id, engineer_id,
            )
            return False

        if grant.patient_id != record_patient_id:
            logger.warning(
                "Diagnostic grant patient mismatch: granted=%s requested=%s",
                grant.patient_id, record_patient_id,
            )
            return False

        return True

    async def revoke_grant(self, session_id: str) -> None:
        """Explicitly revoke a diagnostic grant before TTL expiry."""
        redis_key = f"{_GRANT_PREFIX}{session_id}"
        await self._redis.delete(redis_key)
        logger.info("Diagnostic grant revoked: session=%s", session_id)