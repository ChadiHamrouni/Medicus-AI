"""
Database-backed delivery queue.

Notifications are rows with status='queued' and a send_after time; this loop
claims due rows with FOR UPDATE SKIP LOCKED (safe with several replicas),
hands them to NotificationWorker, and reschedules transient failures with
exponential backoff. No external message broker is required.
"""

import asyncio
from datetime import datetime, timezone

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

from src.core.config import get_notification_settings
from src.worker.notification_worker import NotificationWorker

_CLAIM_SQL = """
WITH due AS (
    SELECT id FROM notif.{role}_notifications
    WHERE status = 'queued' AND (send_after IS NULL OR send_after <= now())
    ORDER BY send_after NULLS FIRST, id
    LIMIT $1
    FOR UPDATE SKIP LOCKED
)
UPDATE notif.{role}_notifications n
SET status = 'processing', attempts = n.attempts + 1, updated_at = now()
FROM due WHERE n.id = due.id
RETURNING n.id, n.attempts
"""

_RESCHEDULE_SQL = """
UPDATE notif.{role}_notifications
SET status = 'queued', send_after = now() + make_interval(secs => $2), updated_at = now()
WHERE id = $1 AND status IN ('queued', 'processing')
"""

_RECOVER_SQL = """
UPDATE notif.{role}_notifications
SET status = 'failed', error_message = 'worker stopped while processing', updated_at = now()
WHERE status = 'processing' AND updated_at < now() - make_interval(mins => $1)
RETURNING id
"""


class NotificationDispatcher:
    def __init__(self, worker: NotificationWorker):
        self.worker = worker
        self.settings = get_notification_settings()
        self._stopping = asyncio.Event()
        self._last_recovery = datetime.min.replace(tzinfo=timezone.utc)

    def stop(self) -> None:
        self._stopping.set()

    async def run(self) -> None:
        logger.info("Notification dispatcher started")
        while not self._stopping.is_set():
            try:
                processed = 0
                for role in ("patient", "doctor"):
                    processed += await self._dispatch_batch(role)
                await self._recover_stuck()
            except Exception:
                logger.exception("Notification dispatcher iteration failed")
                processed = 0
            if not processed:
                try:
                    await asyncio.wait_for(self._stopping.wait(), timeout=self.settings.poll_interval_seconds)
                except asyncio.TimeoutError:
                    pass
        logger.info("Notification dispatcher stopped")

    async def _dispatch_batch(self, role: str) -> int:
        rows = await db_manager.fetch(_CLAIM_SQL.format(role=role), self.settings.batch_size)
        for row in rows:
            done = await self.worker.process_notification(row["id"], attempt=row["attempts"], role=role)
            if not done:
                delay = min(3600, 30 * 2 ** (row["attempts"] - 1))
                await db_manager.execute(_RESCHEDULE_SQL.format(role=role), row["id"], float(delay))
                logger.warning(f"Notification {row['id']} rescheduled in {delay}s (attempt {row['attempts']})")
        return len(rows)

    async def _recover_stuck(self) -> None:
        now = datetime.now(timezone.utc)
        if (now - self._last_recovery).total_seconds() < 300:
            return
        self._last_recovery = now
        for role in ("patient", "doctor"):
            rows = await db_manager.fetch(_RECOVER_SQL.format(role=role), self.settings.stale_threshold_minutes)
            if rows:
                logger.warning(f"Marked {len(rows)} stuck {role} notifications as failed")
