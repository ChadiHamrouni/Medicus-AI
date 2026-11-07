from enum import Enum


class NotificationChannel(str, Enum):
    PUSH = "push"
    EMAIL = "email"
    SMS = "sms"


class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NotificationCategory(str, Enum):
    """
    Fine-grained categories accepted by the API. The service maps the appointment
    sub-types, MESSAGE and SYSTEM onto the coarser preference buckets stored in
    the database (see NotificationService._DB_CATEGORY_MAP).
    """

    APPOINTMENT = "appointment"
    APPOINTMENT_REMINDER = "appointment_reminder"
    APPOINTMENT_CONFIRMED = "appointment_confirmed"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    APPOINTMENT_RESCHEDULED = "appointment_rescheduled"
    SCHEDULE_CHANGE = "schedule_change"
    RX = "rx"
    CARE_PLAN = "care_plan"
    LAB_RESULTS = "lab_results"
    BILLING = "billing"
    MESSAGES = "messages"
    MESSAGE = "message"
    SECURITY = "security"
    SYSTEM = "system"
