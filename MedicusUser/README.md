# MedicusUser

Accounts and the patient record API.

- **Auth:** registration, login, refresh-token rotation with reuse detection, logout, email verification, password reset, rate limiting.
- **Profiles:** patients (and dependents), doctors (practice, hours, procedures, certifications, locations).
- **Medical record (read):** vitals, conditions, medications, notes, procedures, calendar events. Patients see their own; doctors see patients they have a conversation with.
- **Document vault:** upload, rename, share with a doctor, delete, short-lived signed download links.

Routes live under `/api/MedicusUser` (see `src/api/`). Run with `docker compose up -d --build user`; covered by `scripts/smoke_test.py` and `tests/e2e/api_sweep.py`. Overview: root [README](../README.md).