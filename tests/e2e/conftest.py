"""Fixtures for the end-to-end suite.

The tests talk to a running stack through the gateway and need the demo data:

    docker compose up -d
    docker compose --profile demo run --rm seed-demo
    pytest tests/e2e

`scripts/e2e.sh` does all three. When the gateway is not reachable or the demo data is
missing, every test is skipped with the reason instead of failing.
"""

from __future__ import annotations

import httpx
import pytest

from helpers import (AI, BASE_URL, CONVO, DOCTOR_EMAIL, MAILPIT_URL, NOTIFICATION, PATIENT_EMAIL, AiContainer,
                     Api, Thread, login, register_patient)


def pytest_report_header(config):
    return f"gateway: {BASE_URL}"


@pytest.fixture(scope="session")
def api():
    client = Api()
    try:
        client.get(f"{AI}/health/live")
    except httpx.TransportError as exc:
        client.close()
        pytest.skip(f"stack not reachable at {BASE_URL} ({type(exc).__name__}); start it with "
                    "`docker compose up -d` or set E2E_BASE_URL")
    yield client
    client.close()


@pytest.fixture(scope="session")
def patient(api):
    r = api.post("/api/MedicusUser/auth/login", json={"identifier": PATIENT_EMAIL, "password": "MedicusDemo123!"})
    if r.status_code == 401:
        pytest.skip("demo data not loaded: docker compose --profile demo run --rm seed-demo")
    return login(api, PATIENT_EMAIL)


@pytest.fixture(scope="session")
def doctor(api, patient):
    return login(api, DOCTOR_EMAIL)


@pytest.fixture(scope="session")
def accounts(patient, doctor):
    return {"patient": patient, "doctor": doctor}


@pytest.fixture(scope="session")
def attacker(api, patient):
    """A freshly registered patient with no link to the demo patient or doctor."""
    return register_patient(api)


@pytest.fixture(scope="session")
def threads(api, patient, doctor) -> dict[str, Thread]:
    """The demo conversations, by type: patient_doctor, patient_solo, doctor_patient, doctor_solo."""
    found: dict[str, Thread] = {}
    for account, assistant, side, other in ((patient, "mediaid", "patient", "doctor"),
                                            (doctor, "medidoc", "doctor", "patient")):
        r = api.get(f"{CONVO}/conversations/", account.token, params={"assistant": assistant})
        assert r.status_code == 200, r.text[:300]
        for convo in r.json()["conversations"]:
            paired = bool(convo.get("patient_id") and convo.get("doctor_id"))
            found.setdefault(f"{side}_{other}" if paired else f"{side}_solo",
                             Thread(kind="", account=account, assistant=assistant, convo=convo))
    for kind, thread in found.items():
        thread.kind = kind
    missing = {"patient_doctor", "patient_solo", "doctor_patient", "doctor_solo"} - set(found)
    if missing:
        pytest.skip(f"demo conversations missing: {', '.join(sorted(missing))}; reload the demo seed")
    return found


@pytest.fixture(scope="session")
def ai_container():
    reason = AiContainer.available()
    if reason:
        pytest.skip(reason)
    return AiContainer()


@pytest.fixture(scope="session")
def notification_service(api):
    r = api.get(f"{NOTIFICATION}/health/live")
    if r.status_code >= 500:
        pytest.skip("the notification service is not running (docker compose up -d notification)")


@pytest.fixture(scope="session")
def mailpit():
    try:
        httpx.get(f"{MAILPIT_URL}/api/v1/info", timeout=5).raise_for_status()
    except httpx.HTTPError:
        pytest.skip(f"Mailpit not reachable at {MAILPIT_URL} (docker compose up -d mailpit)")
    return MAILPIT_URL
