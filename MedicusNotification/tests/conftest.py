"""
Shared pytest fixtures for MedicusNotification edge case tests.

All external dependencies (DB, Service Bus, providers) are mocked via AsyncMock.
No real infrastructure is required to run these tests.
"""

import asyncio
import json
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from medicus_notification.core.enums import (
    NotificationCategory,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
)
from src.models.notification import DeliveryStatus
from src.providers.base import ProviderResult


# ── Pytest asyncio configuration ──────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for all tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Mock database ─────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """
    AsyncMock for the database manager.

    Supports: fetchrow, fetchval, execute, fetch.
    Each test configures return values via `side_effect` or `return_value`.
    """
    db = AsyncMock()
    db.fetchrow = AsyncMock(return_value=None)
    db.fetchval = AsyncMock(return_value=None)
    db.execute = AsyncMock(return_value=None)
    db.fetch = AsyncMock(return_value=[])
    return db


# ── Mock Service Bus ──────────────────────────────────────────────────────────

@pytest.fixture
def mock_service_bus():
    """AsyncMock for ServiceBusService."""
    sbs = AsyncMock()
    sbs.send_notification = AsyncMock(return_value=True)
    return sbs


# ── Mock providers ────────────────────────────────────────────────────────────

@pytest.fixture
def mock_provider_success():
    """Provider that always succeeds."""
    provider = AsyncMock()
    provider.send = AsyncMock(
        return_value=ProviderResult(
            success=True,
            provider_message_id="msg-123",
        )
    )
    provider.initialize = AsyncMock()
    provider.cleanup = AsyncMock()
    return provider


@pytest.fixture
def mock_provider_permanent_failure():
    """Provider that always fails permanently (4xx)."""
    provider = AsyncMock()
    provider.send = AsyncMock(
        return_value=ProviderResult(
            success=False,
            error_message="Invalid push token",
            is_permanent_failure=True,
        )
    )
    provider.initialize = AsyncMock()
    provider.cleanup = AsyncMock()
    return provider


@pytest.fixture
def mock_provider_transient_failure():
    """Provider that fails transiently (5xx)."""
    provider = AsyncMock()
    provider.send = AsyncMock(
        return_value=ProviderResult(
            success=False,
            error_message="Service temporarily unavailable",
            is_permanent_failure=False,
        )
    )
    provider.initialize = AsyncMock()
    provider.cleanup = AsyncMock()
    return provider


# ── Mock template service ─────────────────────────────────────────────────────

@pytest.fixture
def mock_template_service():
    """AsyncMock for TemplateService returning rendered content."""
    ts = AsyncMock()
    ts.initialize = AsyncMock()
    ts.cleanup = AsyncMock()
    ts.render_template = AsyncMock(
        return_value={"title": "Test Title", "body": "Test Body"}
    )
    return ts


# ── Factory helpers ───────────────────────────────────────────────────────────

def make_notification_record(
    notification_id=1,
    user_id=100,
    template_key="TEST_TEMPLATE",
    template_version=1,
    category="appointment",
    priority="normal",
    channels=None,
    send_after=None,
    payload=None,
    status="queued",
    role="patient",
):
    """Build a dict matching what _get_notification returns."""
    if channels is None:
        channels = ["push", "email"]
    if send_after is None:
        send_after = datetime.now(timezone.utc) - timedelta(minutes=1)
    if payload is None:
        payload = {"first_name": "Alice"}

    return {
        "id": notification_id,
        "user_id": user_id,
        "template_key": template_key,
        "template_version": template_version,
        "category": category,
        "priority": priority,
        "channels": channels,
        "send_after": send_after,
        "payload": payload,
        "status": status,
        "role": role,
    }


def make_user_info(
    user_id=100,
    email="alice@example.com",
    phone_number="+15551234567",
    push_token="ExponentPushToken[xxx]",
    platform="ios",
    language="en",
    timezone_str="UTC",
):
    """Build a dict matching what _get_user_info returns."""
    return {
        "id": user_id,
        "email": email,
        "phone_number": phone_number,
        "push_token": push_token,
        "platform": platform,
        "language": language,
        "timezone": timezone_str,
    }


def make_appointment_payload(
    appointment_id=42,
    patient_id=10,
    doctor_id=20,
    doctor_name="Dr. Smith",
    patient_name="Alice Johnson",
    start_time=None,
):
    """Build a typical appointment event payload."""
    if start_time is None:
        start_time = datetime.now(timezone.utc) + timedelta(days=1)

    return {
        "id": appointment_id,
        "appointment_id": appointment_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "patient_name": patient_name,
        "start_time": start_time.isoformat(),
        "location": "Virtual Clinic",
    }
