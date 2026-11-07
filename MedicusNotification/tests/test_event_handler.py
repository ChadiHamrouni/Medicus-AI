"""
Edge case tests for EventHandler.

All DB calls are mocked via AsyncMock.
Tests: unknown events, missing payloads, category validation, payload normalization.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from medicus_notification.core.enums import (
    NotificationCategory,
    NotificationChannel,
    NotificationPriority,
)
from src.services.event_handler import EventHandler


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_handler(mock_db=None, mock_notification_service=None):
    """Build an EventHandler with mocked dependencies."""
    ns = mock_notification_service or AsyncMock()
    ns.create_notification = AsyncMock(return_value=1)
    ns.db = mock_db or AsyncMock()

    handler = EventHandler(ns)
    return handler


# ── 1. Unknown event type ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unknown_event_type():
    """Unregistered event_type should log a warning and return without error."""
    handler = _build_handler()

    # Should not raise
    await handler.handle_event("CompletelyUnknownEvent", {"some": "data"})

    # create_notification should NOT have been called
    handler.notification_service.create_notification.assert_not_awaited()


# ── 2. Missing user_id in payload ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_missing_user_id_in_payload():
    """When patient_id/doctor_id is missing, template should be skipped."""
    handler = _build_handler()

    # Mock _get_event_configs to return a config that needs patient_id
    handler._get_event_configs = MagicMock(return_value=[
        {
            "template": "TEST_TEMPLATE",
            "category": NotificationCategory.APPOINTMENT,
            "channels": [NotificationChannel.PUSH],
            "priority": NotificationPriority.NORMAL,
            "recipient_source": "patient_id",
            "data_type": "appointment",
        }
    ])

    # No patient_id in payload, _resolve_user_id returns None
    handler._resolve_user_id = AsyncMock(return_value=None)

    await handler.handle_event("TestEvent", {"doctor_id": 5})

    handler.notification_service.create_notification.assert_not_awaited()


# ── 3. Invalid category skipped ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_category_skipped():
    """Invalid category string that's not in the enum → template skipped."""
    handler = _build_handler()

    handler._get_event_configs = MagicMock(return_value=[
        {
            "template": "TEST_TEMPLATE",
            "category": "nonexistent_category",
            "channels": [NotificationChannel.PUSH],
            "priority": NotificationPriority.NORMAL,
            "recipient_source": "patient_id",
            "data_type": "default",
        }
    ])
    handler._resolve_user_id = AsyncMock(return_value=100)

    count = await handler._process_event("TestEvent", {"patient_id": 10})

    assert count == 0
    handler.notification_service.create_notification.assert_not_awaited()


# ── 4. Normalize datetime payload ────────────────────────────────────────────

def test_normalize_datetime_payload():
    """datetime objects in payload should be converted to ISO strings."""
    handler = _build_handler()

    dt = datetime(2026, 3, 1, 14, 30, tzinfo=timezone.utc)
    payload = {"start_time": dt, "name": "Alice"}

    result = handler._normalize_payload("appointment_scheduled", payload)

    assert result["start_time"] == dt.isoformat()
    assert result["name"] == "Alice"


# ── 5. Normalize defaults for appointment events ────────────────────────────

def test_normalize_defaults_appointment():
    """Missing location/reason should get defaults for appointment events."""
    handler = _build_handler()

    # Payload without location and reason
    result = handler._normalize_payload("appointment_rescheduled", {"patient_id": 10})

    assert result["location"] == "Virtual Clinic"
    assert result["reason"] == "No reason provided"


def test_normalize_defaults_not_for_non_appointment():
    """Non-appointment events should NOT get default location/reason."""
    handler = _build_handler()

    result = handler._normalize_payload("rx_ready", {"patient_id": 10})

    # These defaults only apply when "appointment" is in the event_type
    assert "reason" not in result


# ── 6. Resolve user_id for patient ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_resolve_user_id_patient():
    """patient_id → DB lookup returns user_id."""
    mock_db = AsyncMock()
    mock_db.fetchval = AsyncMock(return_value=100)

    handler = _build_handler(mock_db=mock_db)

    user_id = await handler._resolve_user_id("patient_id", {"patient_id": 10})

    assert user_id == 100
    mock_db.fetchval.assert_awaited_once()


# ── 7. Resolve user_id not found ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_resolve_user_id_not_found():
    """Patient not in DB → returns None."""
    mock_db = AsyncMock()
    mock_db.fetchval = AsyncMock(return_value=None)

    handler = _build_handler(mock_db=mock_db)

    user_id = await handler._resolve_user_id("patient_id", {"patient_id": 999})

    assert user_id is None


# ── 8. Category enum from different module ───────────────────────────────────

def test_category_enum_normalization():
    """Category with hasattr(value) from external module → normalized to string."""
    handler = _build_handler()

    # Simulate an enum-like object from a different module
    class ForeignCategory:
        value = "appointment"

    result = handler._validate_category(ForeignCategory(), "TEST_TEMPLATE")

    assert result == NotificationCategory.APPOINTMENT


# ── 9. Appointment cancelled event ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_appointment_cancelled_event():
    """AppointmentCancelled should log and still attempt processing."""
    handler = _build_handler()

    # AppointmentCancelled may have no templates in registry, but should not crash
    await handler.handle_event("AppointmentCancelled", {"appointment_id": 42})

    # No crash is the success criterion


# ── 10. Exception in one template doesn't block others ───────────────────────

@pytest.mark.asyncio
async def test_exception_in_one_template_doesnt_block_others():
    """If first template errors, second should still be processed."""
    handler = _build_handler()

    handler._get_event_configs = MagicMock(return_value=[
        {
            "template": "TEMPLATE_A",
            "category": NotificationCategory.APPOINTMENT,
            "channels": [NotificationChannel.PUSH],
            "priority": NotificationPriority.NORMAL,
            "recipient_source": "patient_id",
            "data_type": "appointment",
        },
        {
            "template": "TEMPLATE_B",
            "category": NotificationCategory.APPOINTMENT,
            "channels": [NotificationChannel.EMAIL],
            "priority": NotificationPriority.NORMAL,
            "recipient_source": "patient_id",
            "data_type": "appointment",
        },
    ])

    # First call raises, second succeeds
    handler._resolve_user_id = AsyncMock(return_value=100)
    handler.notification_service.create_notification = AsyncMock(
        side_effect=[RuntimeError("Template A failed"), 2]
    )

    count = await handler._process_event("TestEvent", {"patient_id": 10})

    # Only the second succeeded
    assert count == 1
