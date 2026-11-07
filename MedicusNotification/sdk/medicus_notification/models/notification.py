from datetime import datetime, time
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from medicus_notification.core.enums import (
    NotificationCategory,
    NotificationChannel,
    NotificationPriority,
    NotificationStatus,
)


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class NotificationTemplate(str, Enum):
    """Template keys seeded by the database migrations."""

    APPOINTMENT_CONFIRMED_PATIENT = "APPOINTMENT_CONFIRMED_PATIENT"
    APPOINTMENT_SCHEDULED_DOCTOR = "APPOINTMENT_SCHEDULED_DOCTOR"
    APPOINTMENT_RESCHEDULED_PATIENT = "APPOINTMENT_RESCHEDULED_PATIENT"
    APPOINTMENT_RESCHEDULED_DOCTOR = "APPOINTMENT_RESCHEDULED_DOCTOR"
    APPOINTMENT_CANCELLED_PATIENT = "APPOINTMENT_CANCELLED_PATIENT"
    APPOINTMENT_CANCELLED_DOCTOR = "APPOINTMENT_CANCELLED_DOCTOR"
    APPOINTMENT_REMINDER_24H = "APPOINTMENT_REMINDER_24H"
    APPOINTMENT_REMINDER_2H = "APPOINTMENT_REMINDER_2H"
    RX_REFILL_REMINDER = "RX_REFILL_REMINDER"
    SECURITY_LOGIN_ALERT = "SECURITY_LOGIN_ALERT"
    SECURITY_PASSWORD_CHANGED = "SECURITY_PASSWORD_CHANGED"
    NEW_MESSAGE_FROM_DOCTOR = "NEW_MESSAGE_FROM_DOCTOR"


class Notification(BaseModel):
    id: int
    user_id: int
    template_key: str
    template_version: int
    category: str
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[NotificationChannel]
    send_after: Optional[datetime] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    status: NotificationStatus = NotificationStatus.QUEUED
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class NotificationDelivery(BaseModel):
    id: int
    notification_id: int
    channel: NotificationChannel
    provider: str
    to_address: str
    status: DeliveryStatus
    error_message: Optional[str] = None
    attempt_count: int = 1
    created_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None


class UserDevice(BaseModel):
    id: int
    user_id: int
    platform: str
    push_token: str
    is_active: bool = True
    last_seen_at: Optional[datetime] = None


class UserNotificationPreference(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    timezone: str = "UTC"
    categories: Dict[NotificationCategory, bool] = Field(default_factory=dict)
