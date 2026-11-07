# MedicusNotification

Event-driven notifications: push (Expo, optional FCM) and email.

- Other services publish domain events (e.g. `AppointmentScheduled`) to `POST /api/v1/events` with `INTERNAL_API_KEY`; the service expands them into per-recipient notifications using templates.
- A Postgres-backed queue (`FOR UPDATE SKIP LOCKED`) delivers them with retries, backoff, quiet hours and per-category user preferences. Appointment reminders are scheduled 24 h and 2 h ahead.
- User-facing routes: device registration and notification settings. Internal routes are blocked at the gateway.

`sdk/` contains the small Python client (`medicus-notification`) other services use to publish events.

Run with `docker compose up -d --build notification`; emails go to Mailpit (`http://localhost:8025`) in development. Overview: root [README](../README.md).