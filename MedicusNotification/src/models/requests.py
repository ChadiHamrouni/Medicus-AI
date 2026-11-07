"""API request models (defined in the medicus_notification SDK)."""

from medicus_notification.models.requests import (
    BulkNotificationRequest,
    CreateNotificationRequest,
    EventRequest,
    RegisterDeviceRequest,
    UpdateCategorySettingRequest,
    UpdateChannelSettingsRequest,
)

__all__ = [
    "BulkNotificationRequest",
    "CreateNotificationRequest",
    "EventRequest",
    "RegisterDeviceRequest",
    "UpdateCategorySettingRequest",
    "UpdateChannelSettingsRequest",
]
