from datetime import datetime, time
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from medicus_notification.core.enums import NotificationStatus


class CreateNotificationResponse(BaseModel):
    notification_id: int
    status: NotificationStatus = NotificationStatus.QUEUED
    scheduled_for: Optional[datetime] = None


NotificationCreateResponse = CreateNotificationResponse


class DeliveryInfo(BaseModel):
    id: int
    channel: str
    provider: str
    status: str
    error_message: Optional[str] = None
    attempt_count: int = 1
    sent_at: Optional[datetime] = None


class NotificationStatusResponse(BaseModel):
    notification_id: int
    status: str
    category: str
    priority: str
    channels: List[str]
    scheduled_for: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deliveries: List[DeliveryInfo] = Field(default_factory=list)


NotificationResponse = NotificationStatusResponse
NotificationDetailResponse = NotificationStatusResponse


class BulkNotificationResponse(BaseModel):
    total: int
    successful: int
    failed: int
    notification_ids: List[int] = Field(default_factory=list)
    errors: Optional[List[Dict[str, Any]]] = None


class EventResponse(BaseModel):
    event_type: str
    notifications_created: int


class DeviceResponse(BaseModel):
    device_id: int
    platform: str
    is_active: bool


class ChannelSettingsResponse(BaseModel):
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    timezone: str = "UTC"


class CategorySettingResponse(BaseModel):
    category: str
    enabled: bool = True


class SettingsResponse(BaseModel):
    channels: ChannelSettingsResponse = Field(default_factory=ChannelSettingsResponse)
    categories: List[CategorySettingResponse] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: str
    timestamp: datetime


HealthCheckResponse = HealthResponse


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Any] = None
