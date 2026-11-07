"""
Domain events understood by MedicusNotification and the notifications each fans out to.

Each entry describes one notification:
  template          template key in notif.notification_templates
  recipient_source  payload field identifying the recipient: user_id | patient_id | doctor_id
  category / channels / priority
  data_type         deep-link type passed to the mobile app
"""

from medicus_notification.core.enums import NotificationCategory, NotificationChannel, NotificationPriority

_PUSH_EMAIL = [NotificationChannel.PUSH, NotificationChannel.EMAIL]


def _pair(patient_template: str, doctor_template: str, category: NotificationCategory, data_type: str) -> list[dict]:
    return [
        {"template": patient_template, "recipient_source": "patient_id", "category": category,
         "channels": _PUSH_EMAIL, "priority": NotificationPriority.HIGH, "data_type": data_type},
        {"template": doctor_template, "recipient_source": "doctor_id", "category": NotificationCategory.APPOINTMENT,
         "channels": _PUSH_EMAIL, "priority": NotificationPriority.NORMAL, "data_type": data_type},
    ]


_SCHEDULED = _pair("APPOINTMENT_CONFIRMED_PATIENT", "APPOINTMENT_SCHEDULED_DOCTOR",
                   NotificationCategory.APPOINTMENT_CONFIRMED, "appointment")
_RESCHEDULED = _pair("APPOINTMENT_RESCHEDULED_PATIENT", "APPOINTMENT_RESCHEDULED_DOCTOR",
                     NotificationCategory.APPOINTMENT_RESCHEDULED, "appointment")
_CANCELLED = _pair("APPOINTMENT_CANCELLED_PATIENT", "APPOINTMENT_CANCELLED_DOCTOR",
                   NotificationCategory.APPOINTMENT_CANCELLED, "appointment")
_NEW_MESSAGE = [{"template": "NEW_MESSAGE_FROM_DOCTOR", "recipient_source": "patient_id",
                 "category": NotificationCategory.MESSAGES, "channels": [NotificationChannel.PUSH],
                 "priority": NotificationPriority.NORMAL, "data_type": "message"}]
_PASSWORD_CHANGED = [{"template": "SECURITY_PASSWORD_CHANGED", "recipient_source": "user_id",
                      "category": NotificationCategory.SECURITY, "channels": _PUSH_EMAIL,
                      "priority": NotificationPriority.HIGH, "data_type": "security"}]

EVENT_REGISTRY: dict[str, list[dict]] = {
    "AppointmentScheduled": _SCHEDULED,
    "appointment_scheduled": _SCHEDULED,
    "AppointmentRescheduled": _RESCHEDULED,
    "appointment_rescheduled": _RESCHEDULED,
    "AppointmentCancelled": _CANCELLED,
    "appointment_cancelled": _CANCELLED,
    "NewMessageFromDoctor": _NEW_MESSAGE,
    "PasswordChanged": _PASSWORD_CHANGED,
}
