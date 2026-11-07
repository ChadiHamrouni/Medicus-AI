"""
Simplified notification service matching the spec.
Handles notification creation, status management, and cancellation.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

from src.core.idempotency import generate_idempotency_key
from src.core.quiet_hours import calculate_delay_for_quiet_hours, get_user_quiet_hours
from medicus_notification.core.enums import (
    NotificationCategory,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
)

DOCTOR_ONLY_CATEGORIES = {
    NotificationCategory.SCHEDULE_CHANGE,
}

PATIENT_ONLY_CATEGORIES = {
    NotificationCategory.RX,
    NotificationCategory.CARE_PLAN,
    NotificationCategory.LAB_RESULTS,
    NotificationCategory.BILLING,
}


class NotificationService:
    """
    Simplified notification service per spec.

    Responsibilities:
    - Create notifications with idempotency
    - Apply user preferences and quiet hours
    - Resolve template versions
    - Handle cancellation

    A row with status='queued' is the queue entry; NotificationDispatcher delivers it.
    """

    def __init__(self):
        self.db = None

    async def initialize(self):
        """Initialize the service."""
        self.db = db_manager
        logger.info("NotificationService initialized")

    async def create_notification(
        self,
        user_id: int,
        template_key: str,
        category: NotificationCategory,
        channels: List[NotificationChannel],
        priority: NotificationPriority = NotificationPriority.NORMAL,
        send_after: Optional[datetime] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Create a notification per spec.

        Steps:
        1. Check user preferences per channel
        2. Apply quiet hours (delay if needed)
        3. Resolve current template version
        4. Generate idempotency key
        4. Resolve language preference
        5. Resolve current template version
        6. Generate idempotency key
        7. Insert DB record with status 'queued'
        """
        payload = payload or {}
        send_after = send_after or datetime.now(timezone.utc)

        # 0. Enrich payload with user data (if missing)
        enrichment = await self._enrich_payload(user_id, payload)

        # 1. Resolve recipient role + actor IDs (patient/doctor)
        recipient = await self._resolve_recipient(user_id, category, payload)
        role = recipient["role"]
        patient_id = recipient.get("patient_id")
        doctor_id = recipient.get("doctor_id")

        # 4. Resolve language (default to en)
        # Check payload first, then enrichment result, then lookup
        language = payload.get("language") or enrichment.get("language")
        if not language:
            language = await self._resolve_language(user_id)

        # Ensure language is in payload for the worker/template renderer
        payload["language"] = language

        # 2. Filter channels by user preferences
        enabled_channels = await self._filter_by_preferences(
            role=role,
            actor_id=patient_id if role == "patient" else doctor_id,
            category=category,
            channels=channels,
        )

        if not enabled_channels:
            logger.warning(f"No enabled channels for user {user_id}, category {category}")
            raise ValueError("All requested channels are disabled by user preferences")

        # 2. Apply quiet hours (security notifications skip this)
        if category != NotificationCategory.SECURITY:
            send_after = await self._apply_quiet_hours(
                role=role,
                actor_id=patient_id if role == "patient" else doctor_id,
                send_after=send_after,
                channels=enabled_channels,
            )

        # 5. Resolve template version
        template_version = await self._get_current_template_version(template_key)

        # 5.5. Validate template exists for user's language (fallback to 'en' if not)
        # This prevents idempotency issues when a template is missing in requested language
        language = await self._validate_template_language(
            template_key=template_key,
            version=template_version,
            channels=enabled_channels,
            requested_language=language
        )
        # Update payload with validated language
        payload["language"] = language

        # 6. Generate idempotency key
        idempotency_key = generate_idempotency_key(
            user_id=user_id,
            template_key=template_key,
            template_version=template_version,
            payload=payload,
            send_after=send_after,
            language=language,
        )

        # 7. Insert notification record
        notification_id = await self._insert_notification(
            user_id=user_id,
            template_key=template_key,
            template_version=template_version,
            category=category,
            priority=priority,
            channels=enabled_channels,
            send_after=send_after,
            payload=payload,
            idempotency_key=idempotency_key,
            role=role,
            patient_id=patient_id,
            doctor_id=doctor_id,
        )

        logger.info(
            f"Created notification {notification_id} for user {user_id} (role={role}, lang={language}), "
            f"channels={[c.value for c in enabled_channels]}, scheduled={send_after}"
        )

        # 9. Auto-schedule reminders for appointment confirmations
        CONFIRMATION_TEMPLATES = {
            "APPOINTMENT_CONFIRMED_PATIENT",
            "APPOINTMENT_CONFIRMED_DOCTOR",
        }
        if template_key in CONFIRMATION_TEMPLATES and role == "patient":
            await self._schedule_appointment_reminders(
                user_id=user_id,
                payload=payload,
            )

        return notification_id

    async def cancel_notification(self, notification_id: int) -> bool:
        """
        Cancel a notification.

        Per spec: Updates status to 'cancelled', worker discards on status check.
        """
        queries = [
            """
                UPDATE notif.doctor_notifications
                SET status = 'cancelled', cancellation_reason = 'user_cancelled'
                WHERE id = $1 AND status = 'queued'
                RETURNING id
            """,
            """
                UPDATE notif.patient_notifications
                SET status = 'cancelled', cancellation_reason = 'user_cancelled'
                WHERE id = $1 AND status = 'queued'
                RETURNING id
            """,
        ]

        for query in queries:
            result = await self.db.fetchrow(query, notification_id)
            if result:
                logger.info(f"Cancelled notification {notification_id}")
                return True

        logger.warning(f"Cannot cancel notification {notification_id} - not in queued status")
        return False



    async def get_notification_status(self, notification_id: int) -> Optional[Dict[str, Any]]:
        """Get notification status with delivery details."""
        # Get notification (cast enum to text for JSON serialization)
        notification_query_doctor = """
            SELECT id, user_id, template_key, category, priority, channels,
                   send_after, status::text as status, created_at, updated_at
            FROM notif.doctor_notifications
            WHERE id = $1
        """
        notification_query_patient = """
            SELECT id, user_id, template_key, category, priority, channels,
                   send_after, status::text as status, created_at, updated_at
            FROM notif.patient_notifications
            WHERE id = $1
        """
        notification = await self.db.fetchrow(notification_query_doctor, notification_id)
        deliveries_query = None

        if notification:
            deliveries_query = """
                SELECT id, channel, provider, to_address, status::text as status,
                       error_message, attempt_count, created_at, sent_at
                FROM notif.doctor_notification_deliveries
                WHERE notification_id = $1
                ORDER BY created_at
            """
        else:
            notification = await self.db.fetchrow(notification_query_patient, notification_id)
            if notification:
                deliveries_query = """
                    SELECT id, channel, provider, to_address, status::text as status,
                           error_message, attempt_count, created_at, sent_at
                    FROM notif.patient_notification_deliveries
                    WHERE notification_id = $1
                    ORDER BY created_at
                """

        if not notification:
            return None

        deliveries = await self.db.fetch(deliveries_query, notification_id)

        return {
            "notification_id": notification["id"],
            "status": notification["status"],
            "category": notification["category"],
            "priority": notification["priority"],
            "channels": notification["channels"],
            "scheduled_for": notification["send_after"],
            "created_at": notification["created_at"],
            "updated_at": notification["updated_at"],
            "deliveries": [
                {
                    "id": d["id"],
                    "channel": d["channel"],
                    "provider": d["provider"],
                    "status": d["status"],
                    "error_message": d["error_message"],
                    "attempt_count": d["attempt_count"],
                    "sent_at": d["sent_at"],
                }
                for d in deliveries
            ],
        }

    async def _filter_by_preferences(
        self,
        role: str,
        actor_id: Optional[int],
        category: NotificationCategory,
        channels: List[NotificationChannel],
    ) -> List[NotificationChannel]:
        """Filter channels based on user preferences."""
        # Security notifications bypass preferences
        if category == NotificationCategory.SECURITY:
            return channels

        # Check category-level preference first
        if actor_id:
            if role == "doctor":
                cat_query = "SELECT enabled FROM notif.doctor_category_settings_view WHERE doctor_id = $1 AND category::text = $2"
            else:
                cat_query = "SELECT enabled FROM notif.patient_category_settings_view WHERE patient_id = $1 AND category::text = $2"
                
            cat_record = await self.db.fetchrow(cat_query, actor_id, category.value)
            # If a record is found and it is explicitly disabled
            if cat_record and not cat_record["enabled"]:
                logger.info(f"Category '{category.value}' is disabled for {role} {actor_id}")
                return []

        prefs = await self._get_user_preferences(role, actor_id)
        if not prefs:
            # Default to all enabled if no prefs found (or log warning)
            return channels

        filtered = []
        for channel in channels:
            # Check global channel setting
            channel_key = f"{channel.value}_enabled"
            if prefs.get(channel_key, True):
                filtered.append(channel)

        return filtered

    async def _apply_quiet_hours(
        self,
        role: str,
        actor_id: Optional[int],
        send_after: datetime,
        channels: List[NotificationChannel],
    ) -> datetime:
        """Apply quiet hours delay if needed (push/sms only)."""
        # Only push and SMS respect quiet hours
        push_or_sms = any(
            c in [NotificationChannel.PUSH, NotificationChannel.SMS] for c in channels
        )
        if not push_or_sms:
            return send_after

        prefs = await self._get_user_preferences(role, actor_id)
        if not prefs or not prefs.get("quiet_hours_enabled"):
            return send_after

        quiet_start = prefs.get("quiet_hours_start")
        quiet_end = prefs.get("quiet_hours_end")
        tz = prefs.get("timezone", "UTC")
        
        if quiet_start and quiet_end:
            return calculate_delay_for_quiet_hours(send_after, quiet_start, quiet_end, tz)
            
        return send_after

    async def _get_user_preferences(
        self,
        role: str,
        actor_id: Optional[int],
    ) -> Optional[Dict[str, Any]]:
        """Get user preferences (channel settings) from materialized views."""
        if not actor_id:
            return None

        if role == "doctor":
            query_doc = """
                SELECT push_enabled, email_enabled, sms_enabled,
                       quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone
                FROM notif.doctor_channel_settings_view
                WHERE doctor_id = $1
            """
            record_doc = await self.db.fetchrow(query_doc, actor_id)
            if record_doc:
                return dict(record_doc)
            return None

        query_patient = """
            SELECT push_enabled, email_enabled, sms_enabled,
                   quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone
            FROM notif.patient_channel_settings_view
            WHERE patient_id = $1
        """
        record_patient = await self.db.fetchrow(query_patient, actor_id)
        if record_patient:
            return dict(record_patient)

        return None

    async def _resolve_recipient(
        self,
        user_id: int,
        category: NotificationCategory,
        payload: Dict[str, Any],
    ) -> Dict[str, Optional[int]]:
        """
        Resolve whether this notification targets a patient or doctor.
        Returns dict: {role, patient_id, doctor_id}
        """
        patient_query = """
            SELECT id FROM public.patients_view
            WHERE user_id = $1 AND relationship = 'main' LIMIT 1
        """
        doctor_query = """
            SELECT id FROM public.doctors_view
            WHERE user_id = $1 LIMIT 1
        """

        patient_id = await self.db.fetchval(patient_query, user_id)
        doctor_id = await self.db.fetchval(doctor_query, user_id)

        logger.info(
            f"[resolve_recipient] user_id={user_id} -> "
            f"patient_id={patient_id} doctor_id={doctor_id}"
        )

        # Guard: user must exist as either a patient or a doctor
        if not patient_id and not doctor_id:
            raise ValueError(
                f"No patient or doctor profile found for user_id={user_id}. "
                "Cannot determine notification recipient."
            )

        role = None
        if patient_id and not doctor_id:
            role = "patient"
        elif doctor_id and not patient_id:
            role = "doctor"
        elif patient_id and doctor_id:
            if category in DOCTOR_ONLY_CATEGORIES:
                role = "doctor"
            elif category in PATIENT_ONLY_CATEGORIES:
                role = "patient"
            elif payload.get("doctor_id"):
                role = "doctor"
            elif payload.get("patient_id"):
                role = "patient"
            else:
                role = "patient"

        if role == "doctor" and not doctor_id:
            raise ValueError(f"Doctor profile not found for user {user_id}")
        if role == "patient" and not patient_id:
            raise ValueError(f"Patient profile not found for user {user_id}")

        return {
            "role": role,
            "patient_id": patient_id if role != "doctor" else None,
            "doctor_id": doctor_id if role == "doctor" else None,
        }

    async def _resolve_language(self, user_id: int) -> str:
        """
        Resolve user language preference from views.
        Default to 'en' if not found or empty.
        Map 'English' -> 'en', 'French' -> 'fr'.
        """
        language_map = {
            "English": "en",
            "French": "fr",
            "english": "en",
            "french": "fr",
            "en": "en",
            "fr": "fr"
        }
        
        # 1. Try Patient table
        try:
            query_patient = "SELECT language_name FROM public.patients_view WHERE user_id = $1 LIMIT 1"
            patient_lang_name = await self.db.fetchval(query_patient, user_id)
            if patient_lang_name:
                return language_map.get(patient_lang_name, "en")
        except Exception:
            pass
            
        # 2. Try Doctor table
        try:
            query_doctor = "SELECT language_name FROM public.doctors_view WHERE user_id = $1 LIMIT 1"
            doctor_lang_name = await self.db.fetchval(query_doctor, user_id)
            if doctor_lang_name:
                return language_map.get(doctor_lang_name, "en")
        except Exception:
            pass

        return "en"

    async def _enrich_payload(self, user_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich payload with user details if missing.
        Fetches first_name/last_name from patient or doctor profile.
        Returns a dict of enriched fields to help local reasoning.
        """
        enrichment = {}
        
        # 1. Fetch recipient's first_name if missing
        if "first_name" not in payload:
            # Try Patient Profile
            query_patient = "SELECT first_name, last_name FROM public.patients_view WHERE user_id = $1 LIMIT 1"
            patient = await self.db.fetchrow(query_patient, user_id)
            
            if patient:
                payload["first_name"] = patient["first_name"]
                payload["last_name"] = patient["last_name"]
                if "patient_name" not in payload:
                    payload["patient_name"] = f"{patient['first_name']} {patient['last_name']}"
                enrichment["first_name"] = patient["first_name"]
            else:
                # Try Doctor Profile
                query_doctor = "SELECT first_name, last_name FROM public.doctors_view WHERE user_id = $1 LIMIT 1"
                doctor = await self.db.fetchrow(query_doctor, user_id)

                if doctor:
                    payload["first_name"] = doctor["first_name"]
                    payload["last_name"] = doctor["last_name"]
                    if "doctor_name" not in payload:
                        payload["doctor_name"] = f"{doctor['first_name']} {doctor['last_name']}"
                    enrichment["first_name"] = doctor["first_name"]

        # 2. Enrich other missing names dynamically using payload IDs
        if payload.get("doctor_id") and "doctor_name" not in payload:
            try:
                doctor_id = int(payload["doctor_id"])
                query_doctor_by_id = "SELECT first_name, last_name FROM public.doctors_view WHERE id = $1 LIMIT 1"
                doctor = await self.db.fetchrow(query_doctor_by_id, doctor_id)
                if doctor:
                    payload["doctor_name"] = f"{doctor['first_name']} {doctor['last_name']}"
                    enrichment["doctor_name"] = payload["doctor_name"]
            except ValueError:
                pass
                
        if payload.get("patient_id") and "patient_name" not in payload:
            try:
                patient_id = int(payload["patient_id"])
                query_patient_by_id = "SELECT first_name, last_name FROM public.patients_view WHERE id = $1 LIMIT 1"
                patient = await self.db.fetchrow(query_patient_by_id, patient_id)
                if patient:
                    payload["patient_name"] = f"{patient['first_name']} {patient['last_name']}"
                    enrichment["patient_name"] = payload["patient_name"]
            except ValueError:
                pass

        # 3. Derive appointment display fields from start_time if not already present
        if "start_time" in payload:
            try:
                start_time_val = payload["start_time"]
                if isinstance(start_time_val, str):
                    start_time_val = datetime.fromisoformat(
                        start_time_val.replace("Z", "+00:00")
                    )
                if "appointment_date" not in payload:
                    payload["appointment_date"] = start_time_val.strftime("%B %d, %Y")
                if "appointment_time" not in payload:
                    payload["appointment_time"] = start_time_val.strftime("%I:%M %p")
            except Exception:
                pass 

        if "location" not in payload:
            payload["location"] = "Virtual Clinic"

        return enrichment

    async def _get_current_template_version(self, template_key: str) -> int:
        """Get the current (highest) active template version."""
        query = """
            SELECT MAX(version) as version
            FROM notif.notification_templates
            WHERE key = $1 AND is_active = TRUE
        """
        result = await self.db.fetchrow(query, template_key)

        if not result or result["version"] is None:
            raise ValueError(f"No active template found for key: {template_key}")

        return result["version"]

    async def _validate_template_language(
        self,
        template_key: str,
        version: int,
        channels: List[NotificationChannel],
        requested_language: str
    ) -> str:
        """
        Validate that template exists for requested language across ALL channels.
        Falls back to 'en' if any channel is missing the requested language.
        
        This prevents idempotency bugs where a notification is created with language='fr'
        but template doesn't exist, causing render failures at delivery time.
        
        Returns: The validated language to use ('fr' if all exist, otherwise 'en')
        """
        if requested_language == "en":
            return "en"  # English is always required, no need to check
        
        query = """
            SELECT COUNT(*) as count
            FROM notif.notification_templates
            WHERE key = $1 AND version = $2 AND channel = ANY($3) 
            AND language = $4 AND is_active = TRUE
        """
        
        channel_values = [c.value for c in channels]
        result = await self.db.fetchrow(query, template_key, version, channel_values, requested_language)
        
        templates_found = result["count"] if result else 0
        templates_needed = len(channels)
        
        if templates_found < templates_needed:
            logger.warning(
                f"Template {template_key} v{version} missing for language '{requested_language}' "
                f"(found {templates_found}/{templates_needed} channels). Falling back to 'en'"
            )
            return "en"
        
        return requested_language

    # Map fine-grained SDK categories → broad DB enum values.
    # The DB enums (patient_categ / doctor_categ) use coarse buckets; appointment
    # sub-types (reminder, confirmed, cancelled, rescheduled) all map to 'appointment'.
    _DB_CATEGORY_MAP: Dict[str, str] = {
        "appointment_reminder":    "appointment",
        "appointment_confirmed":   "appointment",
        "appointment_cancelled":   "appointment",
        "appointment_rescheduled": "appointment",
        "schedule_change":         "appointment",  # doctor_categ has this, patient falls back to appointment
        "message":                 "messages",      # SDK singular → DB plural
        "system":                  "security",      # closest match in DB enum
    }

    def _to_db_category(self, category: NotificationCategory) -> str:
        """Collapse SDK category to the value accepted by the DB enum."""
        return self._DB_CATEGORY_MAP.get(category.value, category.value)

    async def _insert_notification(
        self,
        user_id: int,
        template_key: str,
        template_version: int,
        category: NotificationCategory,
        priority: NotificationPriority,
        channels: List[NotificationChannel],
        send_after: datetime,
        payload: Dict[str, Any],
        idempotency_key: str,
        role: str = "patient",
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
    ) -> int:
        """Insert notification record."""
        import json

        if role == "doctor":
            table = "notif.doctor_notifications"
            id_column = "doctor_id"
            actor_id = doctor_id
        else:
            table = "notif.patient_notifications"
            id_column = "patient_id"
            actor_id = patient_id

        # Collapse fine-grained SDK category to the coarse DB enum value
        db_category = self._to_db_category(category)

        query = f"""
            INSERT INTO {table} (
                user_id, {id_column}, template_key, template_version, category, priority,
                channels, send_after, payload, status, idempotency_key
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'queued', $10)
            RETURNING id
        """
        params = [
            user_id,
            actor_id,
            template_key,
            template_version,
            db_category,          # ← mapped value, not raw category.value
            priority.value,
            [c.value for c in channels],
            send_after,
            json.dumps(payload),
            idempotency_key,
        ]

        try:
            logger.info(
                f"[category-trace] _insert_notification: table={table} "
                f"sdk_category={category.value!r} db_category={db_category!r} "
                f"user_id={user_id} template_key={template_key}"
            )
            result = await self.db.fetchrow(query, *params)
            return result["id"]
        except Exception as e:
            # Likely duplicate idempotency key
            if "idempotency_key" in str(e).lower():
                raise ValueError("Duplicate notification - already exists")
            raise

    async def _schedule_appointment_reminders(
        self,
        user_id: int,
        payload: Dict[str, Any],
    ) -> None:
        """
        Schedule 24h and 2h push reminders for a patient appointment.

        Called automatically after any APPOINTMENT_CONFIRMED_PATIENT notification
        so reminders are created regardless of whether the confirmation came via
        an event or a direct API call.
        """
        start_time_raw = payload.get("start_time")
        if not start_time_raw:
            logger.warning("[reminders] No start_time in payload — cannot schedule reminders")
            return

        try:
            if isinstance(start_time_raw, str):
                start_time = datetime.fromisoformat(start_time_raw.replace("Z", "+00:00"))
            else:
                start_time = start_time_raw
            if not start_time.tzinfo:
                start_time = start_time.replace(tzinfo=timezone.utc)
        except Exception as e:
            logger.warning(f"[reminders] Could not parse start_time {start_time_raw!r}: {e}")
            return

        reminders = [
            ("APPOINTMENT_REMINDER_24H", start_time - timedelta(hours=24), NotificationPriority.NORMAL),
            ("APPOINTMENT_REMINDER_2H",  start_time - timedelta(hours=2),  NotificationPriority.HIGH),
        ]

        appointment_id = payload.get("appointment_id", payload.get("id"))

        for template_key, reminder_time, priority in reminders:
            try:
                await self.create_notification(
                    user_id=user_id,
                    template_key=template_key,
                    category=NotificationCategory.APPOINTMENT_REMINDER,
                    channels=[NotificationChannel.PUSH, NotificationChannel.EMAIL],
                    priority=priority,
                    send_after=reminder_time,
                    payload={**payload, "appointment_id": appointment_id},
                )
                logger.info(
                    f"[reminders] Scheduled {template_key} for user {user_id} "
                    f"at {reminder_time} (appointment_id={appointment_id})"
                )
            except ValueError as e:
                # Duplicate idempotency key means the reminder already exists — safe to ignore
                if "duplicate" in str(e).lower():
                    logger.info(f"[reminders] {template_key} already scheduled for user {user_id}, skipping")
                else:
                    logger.error(f"[reminders] Failed to schedule {template_key} for user {user_id}: {e}")
            except Exception as e:
                logger.error(f"[reminders] Failed to schedule {template_key} for user {user_id}: {e}")


    async def recover_stuck_notifications(self, stuck_threshold_minutes: int = 30) -> int:
        """
        Recover notifications stuck in PROCESSING state.
        These are "DB Zombies" caused by worker crashes or connectivity issues.
        
        Action: Mark them as FAILED so they can be manually retried if needed.
        """
        threshold = datetime.now(timezone.utc) - timedelta(minutes=stuck_threshold_minutes)
        
        query_doctor = """
            UPDATE notif.doctor_notifications
            SET status = 'failed',
                error_message = 'Zombie recovery: stuck in processing',
                updated_at = NOW()
            WHERE status = 'processing' AND updated_at < $1
            RETURNING id
        """
        query_patient = """
            UPDATE notif.patient_notifications
            SET status = 'failed',
                error_message = 'Zombie recovery: stuck in processing',
                updated_at = NOW()
            WHERE status = 'processing' AND updated_at < $1
            RETURNING id
        """

        doctor_results = await self.db.fetch(query_doctor, threshold)
        patient_results = await self.db.fetch(query_patient, threshold)
        count = len(doctor_results) + len(patient_results)

        if count > 0:
            logger.warning(f"Recovered {count} stuck notifications (zombies)")
            for record in doctor_results + patient_results:
                logger.info(f"Marked stuck notification {record['id']} as failed")

        return count

    async def cleanup(self):
        """Cleanup resources."""
        logger.info("NotificationService cleanup complete")
