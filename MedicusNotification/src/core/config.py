"""
MedicusNotification settings. Database, JWT and email settings come from
medicus_common (POSTGRES_*, JWT_*, EMAIL_* / SMTP_*).
"""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class NotificationSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    service_port: int = Field(8004, alias="PORT")
    environment: str = Field("development", alias="ENVIRONMENT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    # Delivery queue (rows in notif.*_notifications)
    worker_enabled: bool = Field(True, alias="WORKER_ENABLED")
    poll_interval_seconds: float = Field(5.0, alias="NOTIFICATION_POLL_INTERVAL_SECONDS")
    batch_size: int = Field(50, alias="NOTIFICATION_BATCH_SIZE")
    stale_threshold_minutes: int = Field(15, alias="STALE_THRESHOLD_MINUTES")
    max_retry_attempts: int = Field(3, alias="MAX_RETRY_ATTEMPTS")

    # Push providers
    expo_access_token: Optional[str] = Field(None, alias="EXPO_ACCESS_TOKEN")
    fcm_credentials_path: Optional[str] = Field(None, alias="FCM_CREDENTIALS_PATH")
    fcm_credentials_json: Optional[str] = Field(None, alias="FCM_CREDENTIALS_JSON")

    # Concurrent sends per channel
    rate_limit_email: int = Field(20, alias="RATE_LIMIT_EMAIL")
    rate_limit_push: int = Field(100, alias="RATE_LIMIT_PUSH")
    rate_limit_sms: int = Field(10, alias="RATE_LIMIT_SMS")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_notification_settings() -> NotificationSettings:
    return NotificationSettings()
