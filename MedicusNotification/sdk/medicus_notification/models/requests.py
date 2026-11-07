from datetime import datetime, time
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from medicus_notification.core.enums import NotificationCategory, NotificationChannel, NotificationPriority


class CreateNotificationRequest(BaseModel):
    user_id: int
    template_key: str = Field(..., min_length=1, max_length=100)
    category: NotificationCategory
    channels: List[NotificationChannel] = Field(..., min_length=1)
    priority: NotificationPriority = NotificationPriority.NORMAL
    send_after: Optional[datetime] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


NotificationCreateRequest = CreateNotificationRequest


class BulkNotificationRequest(BaseModel):
    notifications: List[CreateNotificationRequest] = Field(..., min_length=1, max_length=500)


class EventRequest(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    payload: Dict[str, Any] = Field(default_factory=dict)


class RegisterDeviceRequest(BaseModel):
    platform: Literal["ios", "android", "web"]
    push_token: str = Field(..., min_length=8, max_length=512)


class UpdateChannelSettingsRequest(BaseModel):
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    timezone: Optional[str] = Field(None, max_length=64)


class UpdateCategorySettingRequest(BaseModel):
    category: NotificationCategory
    enabled: bool


class UpdatePreferenceRequest(UpdateChannelSettingsRequest):
    categories: Optional[Dict[NotificationCategory, bool]] = None
