"""
Notification preferences for the calling user.

The `assistant` query parameter picks the profile being configured:
mediaid -> the user's main patient profile, medidoc -> their doctor profile.
Rows are optional; the *_view read models fill in defaults.
"""

from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, Query

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

from src.core.auth import get_current_user
from src.models.requests import UpdateCategorySettingRequest, UpdateChannelSettingsRequest
from src.models.responses import CategorySettingResponse, ChannelSettingsResponse, SettingsResponse

router = APIRouter()

PATIENT_CATEGORIES = ["rx", "appointment", "care_plan", "messages", "lab_results", "billing", "security"]
DOCTOR_CATEGORIES = ["appointment", "messages", "schedule_change", "security"]
_CHANNEL_COLUMNS = ("push_enabled", "email_enabled", "sms_enabled",
                    "quiet_hours_enabled", "quiet_hours_start", "quiet_hours_end", "timezone")


def _tables(role: str) -> Tuple[str, str, str]:
    """(channel table, category table, id column) for a role ('patient' | 'doctor')."""
    if role == "patient":
        return "notif.patient_channel_settings", "notif.patient_category_settings", "patient_id"
    return "notif.doctor_channel_settings", "notif.doctor_category_settings", "doctor_id"


async def get_actor_info(current_user: dict, assistant: str) -> Tuple[int, str]:
    """Resolve (patient_id | doctor_id, role) for the caller in the requested assistant mode."""
    if assistant not in ("mediaid", "medidoc"):
        raise HTTPException(status_code=400, detail="assistant must be 'mediaid' or 'medidoc'")
    user_id = current_user["user_id"]
    if assistant == "medidoc":
        doctor_id = await db_manager.fetchval("SELECT id FROM public.doctors_view WHERE user_id = $1 LIMIT 1", user_id)
        if doctor_id is None:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        return doctor_id, "doctor"
    patient_id = await db_manager.fetchval(
        "SELECT id FROM public.patients_view WHERE user_id = $1 AND relationship = 'main' LIMIT 1", user_id
    )
    if patient_id is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient_id, "patient"


async def _read_settings(actor_id: int, role: str) -> SettingsResponse:
    _, _, id_column = _tables(role)
    channel_row = await db_manager.fetchrow(
        f"SELECT {', '.join(_CHANNEL_COLUMNS)} FROM notif.{role}_channel_settings_view WHERE {id_column} = $1",
        actor_id,
    )
    category_rows = await db_manager.fetch(
        f"SELECT category, enabled FROM notif.{role}_category_settings_view WHERE {id_column} = $1", actor_id
    )
    enabled = {r["category"]: r["enabled"] for r in category_rows}
    all_categories = PATIENT_CATEGORIES if role == "patient" else DOCTOR_CATEGORIES
    return SettingsResponse(
        channels=ChannelSettingsResponse(**dict(channel_row)) if channel_row else ChannelSettingsResponse(),
        categories=[CategorySettingResponse(category=c, enabled=enabled.get(c, True)) for c in all_categories],
    )


async def _write_channels(actor_id: int, role: str, values: dict) -> None:
    table, _, id_column = _tables(role)
    await db_manager.execute(f"INSERT INTO {table} ({id_column}) VALUES ($1) ON CONFLICT ({id_column}) DO NOTHING",
                             actor_id)
    values = {k: v for k, v in values.items() if k in _CHANNEL_COLUMNS and v is not None}
    if values:
        assignments = ", ".join(f"{col} = ${i}" for i, col in enumerate(values, start=2))
        await db_manager.execute(f"UPDATE {table} SET {assignments}, updated_at = now() WHERE {id_column} = $1",
                                 actor_id, *values.values())


async def _write_category(actor_id: int, role: str, category: str, enabled: bool) -> None:
    valid = PATIENT_CATEGORIES if role == "patient" else DOCTOR_CATEGORIES
    if category not in valid:
        raise HTTPException(status_code=400, detail=f"Category '{category}' is not valid for this profile")
    if category == "security" and not enabled:
        raise HTTPException(status_code=400, detail="Security notifications cannot be disabled")
    _, table, id_column = _tables(role)
    await db_manager.execute(
        f"""INSERT INTO {table} ({id_column}, category, enabled) VALUES ($1, $2, $3)
            ON CONFLICT ({id_column}, category) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()""",
        actor_id, category, enabled,
    )


@router.get("", response_model=SettingsResponse)
async def get_settings(assistant: str = Query("mediaid"), current_user: dict = Depends(get_current_user)):
    actor_id, role = await get_actor_info(current_user, assistant)
    return await _read_settings(actor_id, role)


@router.put("/channels", response_model=ChannelSettingsResponse)
async def update_channel_settings(request: UpdateChannelSettingsRequest, assistant: str = Query("mediaid"),
                                  current_user: dict = Depends(get_current_user)):
    actor_id, role = await get_actor_info(current_user, assistant)
    await _write_channels(actor_id, role, request.model_dump())
    return (await _read_settings(actor_id, role)).channels


@router.put("/categories", response_model=CategorySettingResponse)
async def update_category_setting(request: UpdateCategorySettingRequest, assistant: str = Query("mediaid"),
                                  current_user: dict = Depends(get_current_user)):
    actor_id, role = await get_actor_info(current_user, assistant)
    await _write_category(actor_id, role, request.category.value, request.enabled)
    logger.info(f"Updated category {request.category.value} for {role} {actor_id}: enabled={request.enabled}")
    return CategorySettingResponse(category=request.category.value, enabled=request.enabled)


# SDK-compatible endpoints (operate on the caller's own settings only).

def _require_self(user_id: int, current_user: dict) -> None:
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own settings")


async def _mode_for(current_user: dict) -> str:
    is_doctor = await db_manager.fetchval("SELECT 1 FROM public.doctors_view WHERE user_id = $1 LIMIT 1",
                                          current_user["user_id"])
    return "medidoc" if is_doctor else "mediaid"


@router.get("/users/{user_id}", response_model=SettingsResponse)
async def get_user_settings(user_id: int, current_user: dict = Depends(get_current_user)):
    _require_self(user_id, current_user)
    actor_id, role = await get_actor_info(current_user, await _mode_for(current_user))
    return await _read_settings(actor_id, role)


@router.put("/users/{user_id}", response_model=SettingsResponse)
async def update_user_settings(user_id: int, settings: SettingsResponse, current_user: dict = Depends(get_current_user)):
    _require_self(user_id, current_user)
    actor_id, role = await get_actor_info(current_user, await _mode_for(current_user))
    await _write_channels(actor_id, role, settings.channels.model_dump())
    for category_setting in settings.categories:
        await _write_category(actor_id, role, category_setting.category, category_setting.enabled)
    return await _read_settings(actor_id, role)
