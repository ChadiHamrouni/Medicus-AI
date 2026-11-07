"""Async client for MedicusNotification's internal API (service-to-service, X-Internal-Key)."""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from medicus_notification.core.enums import NotificationCategory, NotificationChannel, NotificationPriority


class NotificationClient:
    def __init__(self, base_url: str, api_key: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self._headers = {"X-Internal-Key": api_key}
        self._timeout = timeout

    @classmethod
    def from_env(cls) -> Optional["NotificationClient"]:
        """NOTIFICATION_SERVICE_URL + INTERNAL_API_KEY, or None when notifications are not configured."""
        base_url, key = os.getenv("NOTIFICATION_SERVICE_URL"), os.getenv("INTERNAL_API_KEY")
        return cls(base_url, key) if base_url and key else None

    async def _post(self, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(f"{self.base_url}{path}", json=body, headers=self._headers)
            response.raise_for_status()
            return response.json()

    async def send_event(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Publish a domain event (see EVENT_REGISTRY); the service fans it out to recipients."""
        return await self._post("/api/v1/events", {"event_type": event_type, "payload": payload})

    async def create_notification(
        self,
        user_id: int,
        template_key: str,
        category: NotificationCategory,
        channels: List[NotificationChannel],
        priority: NotificationPriority = NotificationPriority.NORMAL,
        send_after: Optional[datetime] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        body = {
            "user_id": user_id,
            "template_key": getattr(template_key, "value", template_key),
            "category": getattr(category, "value", category),
            "channels": [getattr(c, "value", c) for c in channels],
            "priority": getattr(priority, "value", priority),
            "send_after": send_after.isoformat() if send_after else None,
            "payload": payload or {},
        }
        return await self._post("/api/v1/notifications", body)
