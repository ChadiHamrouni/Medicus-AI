"""
Device registration routes for push notifications.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

from src.core.auth import get_current_user

from src.models.requests import RegisterDeviceRequest
from src.models.responses import DeviceResponse

router = APIRouter()


@router.post("", response_model=DeviceResponse, status_code=201)
async def register_device(
    request: RegisterDeviceRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Register a push device token (Mobile).

    - Creates new device record if token doesn't exist
    - Updates existing record if token already registered
    - Marks old tokens for same user+platform as inactive
    """
    db = db_manager
    user_id = int(current_user["user_id"])

    try:
        # Determine if patient or doctor
        patient_query = """
            SELECT id FROM public.patients_view
            WHERE user_id = $1 AND relationship = 'main' LIMIT 1
        """
        doctor_query = """
            SELECT id FROM public.doctors_view
            WHERE user_id = $1 LIMIT 1
        """

        patient_id = await db.fetchval(patient_query, user_id)
        doctor_id = await db.fetchval(doctor_query, user_id)

        if patient_id and not doctor_id:
            role = "patient"
            actor_id = patient_id
        elif doctor_id and not patient_id:
            role = "doctor"
            actor_id = doctor_id
        elif patient_id and doctor_id:
            role = "patient"
            actor_id = patient_id
        else:
            raise ValueError(f"No patient or doctor profile found for user {user_id}")

        # Deactivate old tokens for this actor+platform
        table = f"notif.{role}_devices"
        deactivate_query = f"""
            UPDATE {table}
            SET is_active = FALSE
            WHERE {role}_id = $1 AND platform = $2 AND push_token != $3
        """
        await db.execute(deactivate_query, actor_id, request.platform, request.push_token)

        # Upsert device
        upsert_query = f"""
            INSERT INTO {table} (user_id, {role}_id, platform, push_token, is_active, last_seen_at)
            VALUES ($1, $2, $3, $4, TRUE, $5)
            ON CONFLICT (push_token)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                {role}_id = EXCLUDED.{role}_id,
                platform = EXCLUDED.platform,
                is_active = TRUE,
                last_seen_at = EXCLUDED.last_seen_at
            RETURNING id, platform, is_active
        """
        result = await db.fetchrow(
            upsert_query,
            user_id,
            actor_id,
            request.platform,
            request.push_token,
            datetime.now(timezone.utc),
        )

        logger.info(f"Registered device for user {user_id} (role={role}), platform {request.platform}")

        return DeviceResponse(
            device_id=result["id"],
            platform=result["platform"],
            is_active=result["is_active"],
        )

    except Exception as e:
        logger.error(f"Error registering device: {e}")
        raise HTTPException(status_code=500, detail="Failed to register device")


class UnregisterByTokenRequest(BaseModel):
    push_token: str = Field(..., min_length=1, max_length=512)


@router.post("/unregister", status_code=204)
async def unregister_device_by_token(
    request: UnregisterByTokenRequest,
    current_user: dict = Depends(get_current_user),
):
    """Deactivate the caller's device by push token (used on logout).

    Scoped to the authenticated user, so a token belonging to someone else is
    never touched. Idempotent: unknown tokens still return 204.
    """
    user_id = int(current_user["user_id"])
    for table in ("notif.patient_devices", "notif.doctor_devices"):
        await db_manager.execute(
            f"UPDATE {table} SET is_active = FALSE WHERE push_token = $1 AND user_id = $2",
            request.push_token,
            user_id,
        )
    return None


@router.delete("/{device_id}", status_code=204)
async def unregister_device(
    device_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Unregister a device (deactivate push token)."""
    db = db_manager
    user_id = int(current_user["user_id"])

    # Determine if patient or doctor
    patient_query = """
        SELECT id FROM public.patients_view
        WHERE user_id = $1 AND relationship = 'main' LIMIT 1
    """
    doctor_query = """
        SELECT id FROM public.doctors_view
        WHERE user_id = $1 LIMIT 1
    """

    patient_id = await db.fetchval(patient_query, user_id)
    doctor_id = await db.fetchval(doctor_query, user_id)

    # Try to unregister from both tables
    queries = []
    if patient_id:
        queries.append((
            """
            UPDATE notif.patient_devices
            SET is_active = FALSE
            WHERE id = $1 AND patient_id = $2
            RETURNING id
            """,
            (device_id, patient_id),
        ))
    if doctor_id:
        queries.append((
            """
            UPDATE notif.doctor_devices
            SET is_active = FALSE
            WHERE id = $1 AND doctor_id = $2
            RETURNING id
            """,
            (device_id, doctor_id),
        ))

    found = False
    for query, params in queries:
        result = await db.fetchrow(query, *params)
        if result:
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Device not found")

    logger.info(f"Unregistered device {device_id} for user {user_id}")
    return None
