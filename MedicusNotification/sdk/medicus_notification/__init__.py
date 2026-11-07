"""Shared contract (enums, models, event registry) and client for the MedicusNotification service."""

from medicus_notification.client import NotificationClient
from medicus_notification.core.enums import (
    NotificationCategory,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
)
from medicus_notification.core.event_registry import EVENT_REGISTRY
from medicus_notification.models.notification import NotificationTemplate

__all__ = [
    "EVENT_REGISTRY",
    "NotificationCategory",
    "NotificationChannel",
    "NotificationClient",
    "NotificationPriority",
    "NotificationStatus",
    "NotificationTemplate",
]
