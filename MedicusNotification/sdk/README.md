# medicus-notification

Shared contract for the MedicusNotification service: enums, request/response models,
the domain-event registry, and an async client.

```python
from medicus_notification import NotificationClient

client = NotificationClient.from_env()  # NOTIFICATION_SERVICE_URL + INTERNAL_API_KEY
await client.send_event("AppointmentScheduled", {
    "id": 42, "patient_id": 7, "doctor_id": 3,
    "start_time": "2026-03-01T10:00:00+00:00",
})
```

Install from the repository root with `pip install ./MedicusNotification/sdk`.
