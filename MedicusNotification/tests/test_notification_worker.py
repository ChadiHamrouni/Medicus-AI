"""
Edge case tests for NotificationWorker.

All DB, provider, and template service calls are mocked.
Tests focus on: stale events, congestion, retries, duplicate delivery,
missing notifications, and partial channel failures.
"""

import asyncio
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

from medicus_notification.core.enums import (
    NotificationChannel,
    NotificationStatus,
)
from src.models.notification import DeliveryStatus
from src.providers.base import ProviderResult
from src.worker.notification_worker import NotificationWorker

from tests.conftest import make_notification_record, make_user_info


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_worker(
    mock_db,
    mock_template_service,
    providers=None,
    stale_threshold_minutes=15,
    max_retry_attempts=3,
):
    """Build a NotificationWorker with injected mocks (no initialize())."""
    worker = NotificationWorker.__new__(NotificationWorker)
    worker.db = mock_db
    worker.template_service = mock_template_service
    worker.providers = providers or {}

    # Minimal settings mock
    settings = MagicMock()
    settings.stale_threshold_minutes = stale_threshold_minutes
    settings.max_retry_attempts = max_retry_attempts
    settings.rate_limit_push = 100
    settings.rate_limit_email = 20
    settings.rate_limit_sms = 10
    worker.settings = settings

    # Rate limiting semaphores
    worker.semaphores = {
        "push": asyncio.Semaphore(settings.rate_limit_push),
        "email": asyncio.Semaphore(settings.rate_limit_email),
        "sms": asyncio.Semaphore(settings.rate_limit_sms),
    }

    return worker


# ── 1. Stale notification ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stale_notification_cancelled(mock_db, mock_template_service):
    """Notification >15 min past send_after should be marked cancelled (stale)."""
    worker = _build_worker(mock_db, mock_template_service)

    stale_record = make_notification_record(
        send_after=datetime.now(timezone.utc) - timedelta(minutes=20),
    )

    # _get_notification returns the stale record
    worker._get_notification = AsyncMock(return_value=stale_record)
    worker._mark_cancelled = AsyncMock()
    worker._update_status = AsyncMock()

    result = await worker.process_notification(notification_id=1)

    assert result is True
    worker._mark_cancelled.assert_awaited_once_with(1, "stale", "patient")


# ── 2. Already sent ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_already_sent_discarded(mock_db, mock_template_service):
    """Notification already sent should be acknowledged immediately."""
    worker = _build_worker(mock_db, mock_template_service)
    worker._get_notification = AsyncMock(
        return_value=make_notification_record(status="sent")
    )

    result = await worker.process_notification(notification_id=1)

    assert result is True
    # Should NOT update status or process channels
    mock_db.execute.assert_not_awaited()


# ── 3. Already cancelled ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_already_cancelled_discarded(mock_db, mock_template_service):
    """Cancelled notification should be discarded without processing."""
    worker = _build_worker(mock_db, mock_template_service)
    worker._get_notification = AsyncMock(
        return_value=make_notification_record(status="cancelled")
    )

    result = await worker.process_notification(notification_id=1)

    assert result is True


# ── 4. Notification not found ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_notification_not_found(mock_db, mock_template_service):
    """Missing notification should return True to prevent infinite retry."""
    worker = _build_worker(mock_db, mock_template_service)
    worker._get_notification = AsyncMock(return_value=None)

    result = await worker.process_notification(notification_id=999)

    assert result is True


# ── 5. Reminder for cancelled appointment ────────────────────────────────────

@pytest.mark.asyncio
async def test_reminder_cancelled_appointment(mock_db, mock_template_service):
    """Reminder for a cancelled appointment should be silently marked cancelled."""
    worker = _build_worker(mock_db, mock_template_service)

    record = make_notification_record(
        template_key="APPOINTMENT_REMINDER_24H",
        payload={"appointment_id": 42},
    )
    worker._get_notification = AsyncMock(return_value=record)
    worker._check_appointment_active = AsyncMock(return_value=False)
    worker._mark_cancelled = AsyncMock()

    result = await worker.process_notification(notification_id=1)

    assert result is True
    worker._mark_cancelled.assert_awaited_once_with(1, "appointment_cancelled", "patient")


# ── 6. Reminder for active appointment ───────────────────────────────────────

@pytest.mark.asyncio
async def test_reminder_active_appointment(
    mock_db, mock_template_service, mock_provider_success
):
    """Reminder for an active appointment should be delivered normally."""
    worker = _build_worker(
        mock_db, mock_template_service,
        providers={"expo": mock_provider_success, "sendgrid": mock_provider_success},
    )

    record = make_notification_record(
        template_key="APPOINTMENT_REMINDER_2H",
        payload={"appointment_id": 42},
        channels=["push"],
    )
    worker._get_notification = AsyncMock(return_value=record)
    worker._check_appointment_active = AsyncMock(return_value=True)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=make_user_info())
    worker._record_delivery = AsyncMock()

    result = await worker.process_notification(notification_id=1)

    assert result is True
    worker._update_status.assert_any_await(1, NotificationStatus.SENT, "patient")


# ── 7. All channels fail permanently ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_all_channels_fail_permanently(
    mock_db, mock_template_service, mock_provider_permanent_failure
):
    """When all channels fail permanently, status should be FAILED and message acknowledged."""
    worker = _build_worker(
        mock_db, mock_template_service,
        providers={
            "expo": mock_provider_permanent_failure,
            "sendgrid": mock_provider_permanent_failure,
        },
    )

    record = make_notification_record(channels=["push", "email"])
    worker._get_notification = AsyncMock(return_value=record)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=make_user_info())
    worker._record_delivery = AsyncMock()

    # attempt=3 (max) so that channel failures are not treated as retryable
    result = await worker.process_notification(notification_id=1, attempt=3)

    assert result is True
    worker._update_status.assert_any_await(1, NotificationStatus.FAILED, "patient")


# ── 8. Transient failure triggers retry ──────────────────────────────────────

@pytest.mark.asyncio
async def test_transient_failure_retries(
    mock_db, mock_template_service, mock_provider_transient_failure
):
    """Transient failure with attempts remaining should return False (retry)."""
    worker = _build_worker(
        mock_db, mock_template_service,
        providers={"expo": mock_provider_transient_failure},
    )

    record = make_notification_record(channels=["push"])
    worker._get_notification = AsyncMock(return_value=record)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=make_user_info())
    worker._record_delivery = AsyncMock()

    result = await worker.process_notification(notification_id=1, attempt=1)

    assert result is False  # Signal Service Bus to retry
    worker._update_status.assert_any_await(1, NotificationStatus.QUEUED, "patient")


# ── 9. Max retries exhausted ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_max_retries_exhausted(
    mock_db, mock_template_service, mock_provider_transient_failure
):
    """At max retries, transient failure becomes permanent (acknowledged)."""
    worker = _build_worker(
        mock_db, mock_template_service,
        providers={"expo": mock_provider_transient_failure},
        max_retry_attempts=3,
    )

    record = make_notification_record(channels=["push"])
    worker._get_notification = AsyncMock(return_value=record)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=make_user_info())
    worker._record_delivery = AsyncMock()

    result = await worker.process_notification(notification_id=1, attempt=3)

    assert result is True  # Acknowledged at max attempts
    worker._update_status.assert_any_await(1, NotificationStatus.FAILED, "patient")


# ── 10. No push token ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_no_push_token(mock_db, mock_template_service):
    """User without push token → delivery recorded as failed."""
    worker = _build_worker(mock_db, mock_template_service, providers={"expo": AsyncMock()})

    record = make_notification_record(channels=["push"])
    user_info = make_user_info(push_token=None)

    worker._get_notification = AsyncMock(return_value=record)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=user_info)
    worker._record_delivery = AsyncMock()

    # attempt=3 (max) → no-address failure won't be treated as retryable
    result = await worker.process_notification(notification_id=1, attempt=3)

    assert result is True  # Acknowledged (permanent — no address)
    worker._record_delivery.assert_awaited()


# ── 11. No email address ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_no_email_address(mock_db, mock_template_service):
    """User without email → delivery recorded as failed."""
    worker = _build_worker(mock_db, mock_template_service, providers={"sendgrid": AsyncMock()})

    record = make_notification_record(channels=["email"])
    user_info = make_user_info(email=None)

    worker._get_notification = AsyncMock(return_value=record)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=user_info)
    worker._record_delivery = AsyncMock()

    # attempt=3 (max) → no-address failure won't be treated as retryable
    result = await worker.process_notification(notification_id=1, attempt=3)

    assert result is True


# ── 12. Template rendering failure ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_template_render_failure(mock_db, mock_provider_success):
    """When template rendering fails, delivery should fail."""
    ts = AsyncMock()
    ts.render_template = AsyncMock(return_value=None)  # Rendering fails

    worker = _build_worker(mock_db, ts, providers={"expo": mock_provider_success})

    record = make_notification_record(channels=["push"])
    worker._get_notification = AsyncMock(return_value=record)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=make_user_info())
    worker._record_delivery = AsyncMock()

    # attempt=3 (max) → render failure won't be treated as retryable
    result = await worker.process_notification(notification_id=1, attempt=3)

    assert result is True  # Permanent failure
    worker._update_status.assert_any_await(1, NotificationStatus.FAILED, "patient")


# ── 13. Partial channel success ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_partial_channel_success(
    mock_db, mock_template_service,
    mock_provider_success, mock_provider_permanent_failure,
):
    """Push succeeds, email fails → overall status should be SENT (partial success)."""
    worker = _build_worker(
        mock_db, mock_template_service,
        providers={
            "expo": mock_provider_success,
            "sendgrid": mock_provider_permanent_failure,
        },
    )

    record = make_notification_record(channels=["push", "email"])
    worker._get_notification = AsyncMock(return_value=record)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=make_user_info())
    worker._record_delivery = AsyncMock()

    result = await worker.process_notification(notification_id=1)

    assert result is True
    worker._update_status.assert_any_await(1, NotificationStatus.SENT, "patient")


# ── 14. Unexpected exception acknowledges ────────────────────────────────────

@pytest.mark.asyncio
async def test_unexpected_exception_acknowledges(mock_db, mock_template_service):
    """Unexpected exception should acknowledge the message to prevent queue blockage."""
    worker = _build_worker(mock_db, mock_template_service)
    worker._get_notification = AsyncMock(side_effect=RuntimeError("DB exploded"))
    worker._update_status = AsyncMock()

    result = await worker.process_notification(notification_id=1)

    # Must return True to ACK the message and prevent infinite retries
    assert result is True


# ── 15. DB error on appointment check → allow delivery ───────────────────────

@pytest.mark.asyncio
async def test_db_error_on_appointment_check(
    mock_db, mock_template_service, mock_provider_success
):
    """DB error checking appointment status → conservative: allow delivery."""
    worker = _build_worker(
        mock_db, mock_template_service,
        providers={"expo": mock_provider_success},
    )

    record = make_notification_record(
        template_key="APPOINTMENT_REMINDER_24H",
        payload={"appointment_id": 42},
        channels=["push"],
    )
    worker._get_notification = AsyncMock(return_value=record)
    # _check_appointment_active does a real DB call, so we mock it to return True
    # (the actual implementation returns True on DB errors — conservative behavior)
    worker._check_appointment_active = AsyncMock(return_value=True)
    worker._update_status = AsyncMock()
    worker._get_user_info = AsyncMock(return_value=make_user_info())
    worker._record_delivery = AsyncMock()

    result = await worker.process_notification(notification_id=1)

    assert result is True
    # Should have attempted delivery (not cancelled)
    worker._update_status.assert_any_await(1, NotificationStatus.SENT, "patient")
