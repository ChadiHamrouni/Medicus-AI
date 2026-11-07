"""
Notification worker - delivers one queued notification (called by NotificationDispatcher).
Per spec, this is the core delivery engine.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from medicus_common.core.database import db_manager

from src.core.config import get_notification_settings
from medicus_notification.core.enums import NotificationChannel, NotificationStatus
from src.models.notification import DeliveryStatus
from src.providers.base import BaseProvider, ProviderResult
from src.providers.email_provider import EmailProvider
from src.providers.expo_provider import ExpoPushProvider
from src.providers.fcm_provider import FCMProvider
from src.services.template_service import TemplateService

logger = logging.getLogger(__name__)


class NotificationWorker:
    """
    Notification worker per spec.

    Responsibilities:
    1. Receive a claimed notification id
    2. Fetch notification by ID
    3. Check status → discard if cancelled or already sent
    4. Check staleness → mark cancelled if >15 min late
    5. Update status → processing
    6. Resolve user language (fallback to en)
    7. Load template by key + version + channel + language
    8. Render template using Jinja2
    9. For each requested channel:
       - Check if user has channel enabled
       - Send via provider
       - Record delivery attempt
    10. Retry transient failures (per channel)
    11. Mark notification sent or failed
    """

    def __init__(self):
        self.settings = get_notification_settings()
        self.db = None
        self.template_service: Optional[TemplateService] = None
        self.providers: Dict[str, BaseProvider] = {}

        # Rate limiting semaphores
        self.semaphores: Dict[str, asyncio.Semaphore] = {}

    async def initialize(self):
        """Initialize worker and providers."""
        self.db = db_manager

        # Initialize template service
        self.template_service = TemplateService()
        await self.template_service.initialize()

        # Push: Expo works out of the box; FCM only when Firebase credentials are configured.
        expo = ExpoPushProvider()
        await expo.initialize()
        self.providers["expo"] = expo

        if self.settings.fcm_credentials_path or self.settings.fcm_credentials_json:
            fcm = FCMProvider()
            await fcm.initialize()
            self.providers["fcm"] = fcm

        email = EmailProvider()
        await email.initialize()
        self.providers["email"] = email

        # Setup rate limiting semaphores
        self.semaphores = {
            "push": asyncio.Semaphore(self.settings.rate_limit_push),
            "email": asyncio.Semaphore(self.settings.rate_limit_email),
            "sms": asyncio.Semaphore(self.settings.rate_limit_sms),
        }

        logger.info("NotificationWorker initialized")

    async def process_notification(
        self,
        notification_id: int,
        attempt: int = 1,
        role: Optional[str] = None,
    ) -> bool:
        """
        Process a notification from the queue.

        Returns True if processed successfully (even if some deliveries failed).
        Returns False if should be retried later.
        """
        try:
            # 1. Fetch notification
            notification = await self._get_notification(notification_id, role)
            if not notification:
                logger.error(f"Notification {notification_id} not found")
                return True  # Don't retry - record doesn't exist

            # 2. Check status
            if notification["status"] in ["cancelled", "sent"]:
                logger.info(f"Notification {notification_id} already {notification['status']}, discarding")
                return True

            # 3. For reminder notifications, verify the appointment has not been cancelled
            REMINDER_TEMPLATE_KEYS = {"APPOINTMENT_REMINDER_24H", "APPOINTMENT_REMINDER_2H"}
            if notification["template_key"] in REMINDER_TEMPLATE_KEYS:
                payload = notification.get("payload") or {}
                appointment_id = payload.get("appointment_id")
                if appointment_id and not await self._check_appointment_active(appointment_id):
                    await self._mark_cancelled(
                        notification_id, "appointment_cancelled", notification["role"]
                    )
                    logger.info(
                        f"Reminder {notification_id} skipped — "
                        f"appointment {appointment_id} is cancelled or not found"
                    )
                    return True  # Acknowledge — no retry needed

            # 4. Check staleness (>15 min late)
            if await self._is_stale(notification):
                await self._mark_cancelled(notification_id, "stale", notification["role"])
                logger.info(f"Notification {notification_id} is stale, cancelled")
                return True

            # 4. Update status to processing
            await self._update_status(notification_id, NotificationStatus.PROCESSING, notification["role"])

            # 5. Get user info (language, email, etc.)
            user_info = await self._get_user_info(notification["user_id"], notification["role"])
            language = user_info.get("language", "en") if user_info else "en"

            # 6-9. Process each channel
            channels = notification["channels"]
            success_count = 0
            has_transient_failure = False

            for channel in channels:
                try:
                    channel_success = await self._process_channel(
                        notification=notification,
                        channel=channel,
                        user_info=user_info,
                        language=language,
                        attempt=attempt,
                    )
                    if channel_success:
                        success_count += 1
                    else:
                        # If we're under max retries, this could be a transient failure
                        if attempt < self.settings.max_retry_attempts:
                            has_transient_failure = True
                except Exception as e:
                    logger.error(
                        f"Error processing channel {channel}: {e}",
                        exc_info=True
                    )

            # 10. Update final status and determine retry
            if success_count > 0:
                await self._update_status(notification_id, NotificationStatus.SENT, notification["role"])
                logger.info(f"Notification {notification_id} sent ({success_count}/{len(channels)} channels)")
                return True  # At least partial success - acknowledge
            elif has_transient_failure:
                # All channels failed with transient errors - retry
                logger.warning(
                    f"Notification {notification_id} has transient failures, "
                    f"will retry (attempt {attempt}/{self.settings.max_retry_attempts})"
                )
                await self._update_status(notification_id, NotificationStatus.QUEUED, notification["role"])
                return False  # dispatcher reschedules with backoff
            else:
                # All channels failed permanently
                await self._update_status(notification_id, NotificationStatus.FAILED, notification["role"])
                logger.error(f"Notification {notification_id} failed all channels permanently")
                return True  # Permanent failure - acknowledge to prevent infinite retry

        except Exception as e:
            logger.error(
                f"Error processing notification {notification_id}: {e}",
                exc_info=True
            )
            try:
                await self._update_status(notification_id, NotificationStatus.FAILED, notification["role"])
                logger.error(f"Notification {notification_id} marked as FAILED due to exception")
            except Exception as db_e:
                logger.error(
                    f"Failed to update status for {notification_id}: {db_e}",
                    exc_info=True
                )
            
            # For unexpected exceptions, acknowledge to prevent queue blockage
            return True

    async def _process_channel(
        self,
        notification: dict,
        channel: str,
        user_info: Optional[dict],
        language: str,
        attempt: int,
    ) -> bool:
        """Process a single channel delivery."""
        notification_id = notification["id"]
        template_key = notification["template_key"]
        template_version = notification["template_version"]
        payload = notification["payload"] or {}

        # Get recipient address
        to_address = self._get_recipient_address(channel, user_info)
        if not to_address:
            logger.warning(f"No address for channel {channel}, user {notification['user_id']}")
            await self._record_delivery(
                notification_id, channel, "", DeliveryStatus.FAILED,
                error_message="No recipient address",
                role=notification["role"],
            )
            return False

        # Render template
        rendered = await self.template_service.render_template(
            key=template_key,
            version=template_version,
            channel=channel,
            variables=payload,
            language=language,
        )

        if not rendered:
            logger.error(f"Template rendering failed for {template_key}")
            await self._record_delivery(
                notification_id, channel, to_address, DeliveryStatus.FAILED,
                error_message="Template rendering failed",
                role=notification["role"],
            )
            return False

        # Get provider
        provider = self._get_provider_for_channel(channel)
        if not provider:
            logger.error(f"No provider for channel {channel}")
            await self._record_delivery(
                notification_id, channel, to_address, DeliveryStatus.FAILED,
                error_message="No provider configured",
                role=notification["role"],
            )
            return False

        # Build data payload for push notifications
        push_data = dict(payload)
        push_data["role"] = notification.get("role", "patient")
        
        # Log the payload before modification
        print(f"[NotificationWorker] Original payload for {notification_id}: {payload}", flush=True)
        
        if "category" not in push_data and notification.get("category"):
            # Ensure the category is a primitive string, not an enum, so Expo API allows it
            cat_val = notification.get("category")
            push_data["category"] = getattr(cat_val, "value", str(cat_val))
            
        print(f"[NotificationWorker] Final push_data for {notification_id}: {push_data}", flush=True)

        # Send with rate limiting
        semaphore = self.semaphores.get(channel)
        async with semaphore:
            result = await provider.send(
                to_address=to_address,
                title=rendered.get("title"),
                body=rendered["body"],
                data=push_data if channel == "push" else payload.get("data"),
            )

        # Record delivery
        provider_name = self._get_provider_name(channel)
        if result.success:
            await self._record_delivery(
                notification_id, channel, to_address, DeliveryStatus.SENT,
                provider=provider_name,
                provider_message_id=result.provider_message_id,
                role=notification["role"],
            )
            return True
        else:
            # Check if should retry
            if result.should_retry and attempt < self.settings.max_retry_attempts:
                logger.warning(f"Transient failure for {channel}, will retry")
                # Don't record as failed yet - will be retried
                return False
            else:
                await self._record_delivery(
                    notification_id, channel, to_address, DeliveryStatus.FAILED,
                    provider=provider_name,
                    error_message=result.error_message,
                    attempt_count=attempt,
                    role=notification["role"],
                )
                return False

    async def _get_notification(
        self,
        notification_id: int,
        role: Optional[str] = None,
    ) -> Optional[dict]:
        """Fetch notification from database (doctor or patient table)."""
        if not role:
            # Try both tables
            for try_role in ["doctor", "patient"]:
                query = f"""
                    SELECT id, user_id, template_key, template_version, category,
                           priority, channels, send_after, payload, status::text as status
                    FROM notif.{try_role}_notifications
                    WHERE id = $1
                """
                record = await self.db.fetchrow(query, notification_id)
                if record:
                    record = dict(record)
                    record["role"] = try_role
                    if isinstance(record.get("payload"), str):
                        try:
                            record["payload"] = json.loads(record["payload"])
                        except Exception as e:
                            logger.error(
                                f"Failed to parse payload for notification {notification_id}: {e}",
                                exc_info=True
                            )
                    return record
            return None

        query = f"""
            SELECT id, user_id, template_key, template_version, category,
                   priority, channels, send_after, payload, status::text as status
            FROM notif.{role}_notifications
            WHERE id = $1
        """
        record = await self.db.fetchrow(query, notification_id)
        if not record:
            return None

        result = dict(record)
        result["role"] = role
        # Parse payload string back to dict if needed (asyncpg returns string for jsonb)
        if isinstance(result.get("payload"), str):
            try:
                result["payload"] = json.loads(result["payload"])
            except Exception as e:
                logger.error(
                    f"Failed to parse payload for notification {notification_id}: {e}",
                    exc_info=True
                )

        return result

    async def _is_stale(self, notification: dict) -> bool:
        """Check if notification is stale (>15 min past send_after)."""
        send_after = notification.get("send_after")
        if not send_after:
            return False

        threshold = datetime.now(timezone.utc) - timedelta(
            minutes=self.settings.stale_threshold_minutes
        )
        return send_after < threshold

    async def _check_appointment_active(self, appointment_id) -> bool:
        """
        Returns True if the appointment exists and is NOT cancelled.

        Called before delivering reminder notifications so that we silently
        discard reminders for appointments that were cancelled after the
        reminder was originally scheduled.
        """
        try:
            query = "SELECT id FROM public.medical_visits_view WHERE id = $1"
            status = await self.db.fetchval(query, int(appointment_id))
            if status is None:
                logger.warning(
                    f"Appointment {appointment_id} not found — treating as cancelled"
                )
                return False
            return True
        except Exception as e:
            # On DB errors be conservative: allow delivery rather than
            # silently dropping the reminder.
            logger.error(
                f"Error checking appointment {appointment_id} status: {e}",
                exc_info=True,
            )
            return True

    async def _update_status(
        self,
        notification_id: int,
        status: NotificationStatus,
        role: str = "patient",
    ):
        """Update notification status."""
        query = f"""
            UPDATE notif.{role}_notifications
            SET status = $2
            WHERE id = $1
        """
        await self.db.execute(query, notification_id, status.value)

    async def _mark_cancelled(
        self,
        notification_id: int,
        reason: str,
        role: str = "patient",
    ):
        """Mark notification as cancelled with reason."""
        query = f"""
            UPDATE notif.{role}_notifications
            SET status = 'cancelled', cancellation_reason = $2
            WHERE id = $1
        """
        await self.db.execute(query, notification_id, reason)

    async def _get_user_info(self, user_id: int, role: str) -> Optional[dict]:
        """Get user info for delivery."""
        query = """
            SELECT
                u.id,
                u.email,
                u.phone_number,
                up.timezone,
                up.language
            FROM auth.users u
            LEFT JOIN auth.user_profiles up ON up.user_id = u.id
            WHERE u.id = $1
        """
        record = await self.db.fetchrow(query, user_id)
        if not record:
            return None

        # Also get push tokens from appropriate device table
        if role == "doctor":
            tokens_query = """
                SELECT push_token, platform
                FROM notif.doctor_devices
                WHERE doctor_id IN (
                    SELECT id FROM public.doctors_view WHERE user_id = $1
                ) AND is_active = TRUE
                ORDER BY last_seen_at DESC NULLS LAST
                LIMIT 1
            """
        else:
            tokens_query = """
                SELECT push_token, platform
                FROM notif.patient_devices
                WHERE patient_id IN (
                    SELECT id FROM public.patients_view WHERE user_id = $1
                ) AND is_active = TRUE
                ORDER BY last_seen_at DESC NULLS LAST
                LIMIT 1
            """
        token_record = await self.db.fetchrow(tokens_query, user_id)

        result = dict(record)
        if token_record:
            result["push_token"] = token_record["push_token"]
            result["platform"] = token_record["platform"]

        return result

    def _get_recipient_address(self, channel: str, user_info: Optional[dict]) -> Optional[str]:
        """Get recipient address for channel."""
        if not user_info:
            return None

        if channel == "push":
            return user_info.get("push_token")
        elif channel == "email":
            return user_info.get("email")
        elif channel == "sms":
            return user_info.get("phone_number")

        return None

    def _get_provider_for_channel(self, channel: str) -> Optional[BaseProvider]:
        """Provider for a channel. SMS has no built-in provider yet (see CONTRIBUTING)."""
        if channel == "push":
            return self.providers.get("expo")
        if channel == "email":
            email = self.providers.get("email")
            return email if email and email.initialized else None
        return None

    def _get_provider_name(self, channel: str) -> str:
        """Provider name recorded in the delivery log."""
        return {"push": "expo", "email": "email"}.get(channel, "unknown")

    async def _record_delivery(
        self,
        notification_id: int,
        channel: str,
        to_address: str,
        status: DeliveryStatus,
        provider: str = "unknown",
        provider_message_id: Optional[str] = None,
        error_message: Optional[str] = None,
        attempt_count: int = 1,
        role: str = "patient",
    ):
        """Record delivery attempt."""
        query = f"""
            INSERT INTO notif.{role}_notification_deliveries (
                notification_id, channel, provider, to_address, status,
                error_message, attempt_count, sent_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """
        sent_at = datetime.now(timezone.utc) if status == DeliveryStatus.SENT else None

        await self.db.execute(
            query,
            notification_id,
            channel,
            provider,
            to_address,
            status.value,
            error_message,
            attempt_count,
            sent_at,
        )

    async def cleanup(self):
        """Cleanup worker resources."""
        for provider in self.providers.values():
            await provider.cleanup()

        if self.template_service:
            await self.template_service.cleanup()

        logger.info("NotificationWorker cleanup complete")
