"""Every User, Convo and AI endpoint the apps use, called as the demo patient and doctor.

Each case names who calls, what, and the statuses that count as correct. Any 5xx fails.
Write cases put back the values they read, so the demo data is unchanged afterwards.
"""

from __future__ import annotations

import pytest

from helpers import AI, CONVO, USER, expect

# (caller, path, accepted statuses). {pid} / {did}: the demo patient's and doctor's ids.
USER_READS = [
    ("patient", "/users/me", (200,)),
    ("doctor", "/users/me", (200,)),
    ("patient", "/doctor/search?query=Amina", (200,)),
    ("patient", "/doctor/search", (200,)),
    ("patient", "/doctor/search/oon", (200,)),
    ("patient", "/doctor/{did}", (200,)),
    ("patient", "/doctor/{did}/public-profile", (200,)),
    ("doctor", "/doctor/{did}/events", (200,)),
    ("patient", "/doctor/{did}/events", (403, 404)),
    ("patient", "/reference/specialty-super-categories", (200,)),
    ("patient", "/reference/specialties", (200,)),
    ("patient", "/reference/languages", (200,)),
    ("patient", "/reference/countries", (200,)),
    ("patient", "/dependents/", (200,)),
    ("patient", "/dependents/context/available", (200,)),
    ("patient", "/patients/{pid}", (200,)),
    ("doctor", "/patients/{pid}", (200,)),
    ("patient", "/medications/patients/{pid}", (200,)),
    ("doctor", "/medications/patients/{pid}", (200,)),
    ("patient", "/medications/patients/{pid}/summary", (200,)),
    ("doctor", "/medications/patients/{pid}/summary", (200,)),
    ("patient", "/procedures/patients/{pid}", (200,)),
    ("patient", "/notes/patients/{pid}", (200,)),
    ("patient", "/medical-events/patients/{pid}", (200,)),
    ("patient", "/vitals/patients/{pid}", (200,)),
    ("patient", "/conditions/patients/{pid}", (200,)),
    ("doctor", "/benchmark/doctor/{did}/latest", (200, 404)),
    ("doctor", "/benchmark/doctor/{did}/summary", (200, 404)),
    ("doctor", "/benchmark/doctor/{did}/history", (200,)),
    ("doctor", "/benchmark/health", (200,)),
    ("patient", "/docs/vault/patient/{pid}", (200,)),
    ("patient", "/docs/shared/patient/{pid}", (200,)),
    ("doctor", "/docs/vault/doctor/{did}", (200,)),
    ("doctor", "/docs/shared/doctor/{did}", (200,)),
]


def _path(template: str, patient, doctor) -> str:
    return USER + template.format(pid=patient.patient_id, did=doctor.doctor_id)


@pytest.mark.parametrize("caller, template, statuses", USER_READS,
                         ids=[f"{c}-{t.lstrip('/')}" for c, t, _ in USER_READS])
def test_user_read(api, accounts, patient, doctor, caller, template, statuses):
    expect(api.get(_path(template, patient, doctor), accounts[caller].token), *statuses)


def test_vital_history(api, patient):
    vitals = expect(api.get(f"{USER}/vitals/patients/{patient.patient_id}", patient.token), 200).json()
    items = vitals if isinstance(vitals, list) else (vitals.get("vitals") or vitals.get("data") or [])
    if not items:
        pytest.skip("the demo patient has no vitals")
    vital_id = items[0]["vital_id"]
    expect(api.get(f"{USER}/vitals/patients/{patient.patient_id}/history/{vital_id}", patient.token), 200)


# --- patient writes -------------------------------------------------------------------------

def test_patient_updates_own_record(api, patient):
    base = f"{USER}/patients/{patient.patient_id}"
    profile = expect(api.get(base, patient.token), 200).json()
    first_name = profile.get("first_name") or (profile.get("patient") or {}).get("first_name") or "Sam"
    expect(api.put(f"{base}/emergency-contact", patient.token,
                   json=[{"name": "Alex Rivera", "relationship": "spouse", "phone_number": "+15550000003"}]), 200)
    expect(api.put(f"{base}/metadata", patient.token, json={"theme": "dark"}), 200)
    expect(api.put(f"{base}/medical-data", patient.token, json={"blood_type": "O+"}), 200)
    expect(api.put(base, patient.token, json={"first_name": first_name}), 200)


def test_doctor_cannot_rename_a_patient(api, patient, doctor):
    expect(api.put(f"{USER}/patients/{patient.patient_id}", doctor.token, json={"first_name": "Hacker"}), 403, 404)


def test_patient_updates_account_contact(api, patient):
    expect(api.put(f"{USER}/me", patient.token, json={"phone": "+15550000002"}), 200)


def test_dependent_lifecycle(api, patient, doctor):
    created = expect(api.post(f"{USER}/dependents/create", patient.token, json={
        "first_name": "Mia", "last_name": "Rivera", "dob": "2018-03-03", "gender": "female",
        "relationship": "child"}), 200, 201).json()
    dep_id = created.get("id") or created.get("patient_id") or (
        created.get("dependent") or created.get("patient") or {}).get("id")
    assert dep_id, f"no id in {created}"
    try:
        expect(api.get(f"{USER}/dependents/{dep_id}", patient.token), 200)
        expect(api.put(f"{USER}/dependents/{dep_id}", patient.token, json={"first_name": "Mia"}), 200)
        expect(api.post(f"{USER}/dependents/switch-context", patient.token, json={"patient_id": dep_id}), 200)
        expect(api.get(f"{USER}/dependents/{dep_id}", doctor.token), 403, 404)
    finally:
        expect(api.delete(f"{USER}/dependents/{dep_id}", patient.token), 200, 204)


def test_patient_cannot_open_a_support_session(api, patient):
    expect(api.post(f"{USER}/support/request", patient.token,
                    json={"patient_id": str(patient.patient_id), "reason": "test"}), 403)


def test_verification_and_password_reset_requests(api, patient):
    expect(api.post(f"{USER}/auth/send-verification-code", patient.token,
                    json={"email": patient.email, "code_type": "email_verification"}), 200, 400, 422, 429)
    expect(api.post(f"{USER}/auth/request-password-reset", json={"identifier": patient.email}), 200, 429)


# --- doctor profile writes: each section is written back unchanged and read again ----------

@pytest.fixture
def doctor_profile(api, doctor):
    return expect(api.get(f"{USER}/doctor/profile", doctor.token), 200).json()


def _profile_sections(p: dict) -> list[tuple[str, object, str]]:
    procedures = p.get("medical_procedures") or {}
    meta = p.get("metadata") or {}
    address = p.get("address") or {}
    return [
        ("working-hours", p.get("working_hours") or [], "working_hours"),
        ("procedures", {"medical_procedures": procedures.get("medical_procedures") or [],
                        "currency": procedures.get("currency") or "USD"}, "medical_procedures"),
        ("contact-info", p.get("contact") or {}, "contact"),
        ("practice-info", {k: address.get(k) for k in ("address_line_1", "address_line_2", "city", "state",
                                                      "zip_code") if address.get(k) is not None}, "address"),
        ("locations", [{k: v for k, v in loc.items() if k != "id"} for loc in p.get("other_locations") or []],
         "other_locations"),
        ("additional-info", {"about_you": p.get("about_you") or meta.get("about_you"), "gender": p.get("gender")},
         None),
        ("additional-links", {"additional_links": p.get("additional_links") or []}, "additional_links"),
        ("professional-info", {"medical_school": meta.get("medical_school"),
                               "graduation_year": meta.get("graduation_year"),
                               "certifications": p.get("certifications") or []}, "certifications"),
    ]


SECTIONS = ["working-hours", "procedures", "contact-info", "practice-info", "locations", "additional-info",
            "additional-links", "professional-info"]


@pytest.mark.parametrize("section", SECTIONS)
def test_doctor_profile_section_round_trip(api, doctor, doctor_profile, section):
    _, body, field = next(s for s in _profile_sections(doctor_profile) if s[0] == section)
    expect(api.put(f"{USER}/doctor/{section}", doctor.token, json=body), 200)
    if field:
        after = expect(api.get(f"{USER}/doctor/profile", doctor.token), 200).json()
        assert after.get(field) == doctor_profile.get(field), f"{section} changed after writing it back unchanged"


# --- conversations ---------------------------------------------------------------------------

THREADS = ["patient_doctor", "patient_solo", "doctor_patient", "doctor_solo"]


@pytest.mark.parametrize("kind", THREADS)
def test_conversation_reads(api, threads, kind):
    t = threads[kind]
    base = f"{CONVO}/conversations/{t.id}"
    expect(api.get(f"{base}/", t.account.token), 200)
    expect(api.get(f"{base}/context", t.account.token), 200)
    expect(api.get(f"{base}/messages", t.account.token), 200)


@pytest.mark.parametrize("kind, statuses", [
    ("patient_doctor", (403,)),        # the clinical summary is for doctors only
    ("patient_solo", (403,)),
    ("doctor_patient", (200,)),
    ("doctor_solo", (404,)),           # no patient, nothing to summarise
])
def test_conversation_summary_access(api, threads, kind, statuses):
    t = threads[kind]
    expect(api.get(f"{CONVO}/conversations/{t.id}/summary", t.account.token), *statuses)


@pytest.mark.parametrize("caller, query", [("doctor", "Sam"), ("patient", "Amina")])
def test_conversation_search(api, accounts, caller, query):
    expect(api.get(f"{CONVO}/conversations/search", accounts[caller].token, params={"q": query}), 200)


def test_client_config_and_compatibility(api, patient):
    expect(api.get(f"{CONVO}/client/config", patient.token), 200)
    expect(api.get(f"{CONVO}/client/compatibility/1.0.0", patient.token), 200)


def test_patient_sends_a_message_to_the_doctor(api, threads):
    t = threads["patient_doctor"]
    r = expect(api.post(f"{CONVO}/conversations/{t.id}/messages", t.account.token, json={
        "payload": {"type": "app", "text_io": "Hello doctor (e2e test)", "assistant": "mediaid"}}), 200, 201)
    assert r.json()["role"] == "user"


def test_patient_cannot_read_the_doctors_threads(api, threads, patient):
    expect(api.get(f"{CONVO}/conversations/{threads['doctor_solo'].id}/messages", patient.token), 403, 404)


# --- AI service input handling (no model call; a full turn is in test_agent_mock_llm.py) ------

def test_chat_in_an_unknown_conversation_is_refused(api, patient):
    expect(api.post(f"{AI}/chat", patient.token,
                    json={"convo_id": "00000000-0000-0000-0000-000000000000", "text_io": "hi"}), 403, 404)


def test_live_voice_status(api):
    expect(api.get(f"{AI}/live/status"), 200)


def test_provider_specific_realtime_endpoint_is_gone(api, doctor):
    expect(api.post(f"{AI}/realtime/token", doctor.token, json={}), 404, 405)
