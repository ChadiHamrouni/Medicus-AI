"""Authentication, authorization (IDOR), uploads, signed links and gateway rules.

`attacker` is a freshly registered patient with no link to the demo records: every request
it makes for someone else's data must be refused, and with 404 rather than 403 where the
API hides whether the record exists.
"""

from __future__ import annotations

import re
import time
import uuid

import httpx
import pytest

from helpers import AI, CONVO, DEMO_PASSWORD, DOCTOR_EMAIL, NOTIFICATION, USER, expect, login

PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c6360000002000154a24f6a0000000049454e44ae426082")
PDF = b"%PDF-1.4\n%%EOF\n"


# --- authentication -------------------------------------------------------------------------

def test_wrong_password_is_rejected(api, patient):
    expect(api.post(f"{USER}/auth/login", json={"identifier": patient.email, "password": "wrong-password"}), 401)


def test_self_registration_as_admin_is_rejected(api):
    expect(api.post(f"{USER}/auth/register", json={
        "email": f"admin-{uuid.uuid4().hex[:8]}@example.com", "password": "Sup3rSecret!", "role": "admin",
        "first_name": "Eve", "last_name": "Admin"}), 422)


def test_verification_code_locks_after_five_wrong_guesses(api, mailpit):
    email = f"e2e-verify-{uuid.uuid4().hex[:8]}@example.com"
    expect(api.post(f"{USER}/auth/register", json={
        "email": email, "password": "Att4ckerPass!", "role": "patient", "first_name": "Riley",
        "last_name": "Example", "dob": "1990-01-01", "gender": "female"}), 201)
    expect(api.post(f"{USER}/auth/send-verification-code", json={"email": email}), 200)

    code = None
    for _ in range(15):                      # the email goes out over SMTP to Mailpit
        found = httpx.get(f"{mailpit}/api/v1/search", params={"query": f"to:{email}"}, timeout=10).json()
        if found.get("messages"):
            message = httpx.get(f"{mailpit}/api/v1/message/{found['messages'][0]['ID']}", timeout=10).json()
            match = re.search(r"\b(\d{6})\b", message.get("Text", ""))
            code = match.group(1) if match else None
            break
        time.sleep(1)
    assert code, "no verification email reached Mailpit"

    for _ in range(5):
        api.post(f"{USER}/auth/verify-email", json={"email": email, "code": "000000"})
    # 400: code locked. 429: the per-IP auth rate limit kicked in first. Either way the right
    # code is refused after five wrong guesses.
    expect(api.post(f"{USER}/auth/verify-email", json={"email": email, "code": code}), 400, 429)


# --- patient records -------------------------------------------------------------------------

def test_patient_and_treating_doctor_read_vitals(api, patient, doctor):
    for who in (patient, doctor):
        expect(api.get(f"{USER}/vitals/patients/{patient.patient_id}", who.token), 200)


@pytest.mark.parametrize("method, template, body", [
    ("GET", "/vitals/patients/{pid}", None),
    ("GET", "/patients/{pid}", None),
    ("PUT", "/patients/{pid}/medical-data", {"allergies": ["x"]}),
    ("GET", "/docs/vault/patient/{pid}", None),
], ids=["vitals", "profile", "modify-medical-data", "list-vault"])
def test_unrelated_user_cannot_touch_patient_records(api, patient, attacker, method, template, body):
    path = USER + template.format(pid=patient.patient_id)
    expect(api.request(method, path, attacker.token, json=body), 404)


def test_only_the_doctor_reads_their_agenda(api, patient, doctor):
    expect(api.get(f"{USER}/doctor/{doctor.doctor_id}/events", patient.token), 404)
    expect(api.get(f"{USER}/doctor/{doctor.doctor_id}/events", doctor.token), 200)


# --- conversations ---------------------------------------------------------------------------

@pytest.mark.parametrize("suffix", ["messages", "context"])
def test_unrelated_user_cannot_read_a_conversation(api, threads, attacker, suffix):
    expect(api.get(f"{CONVO}/conversations/{threads['patient_doctor'].id}/{suffix}", attacker.token), 404)


def test_client_cannot_post_as_the_assistant(api, threads):
    t = threads["patient_doctor"]
    expect(api.post(f"{CONVO}/conversations/{t.id}/messages", t.account.token, json={
        "payload": {"type": "cloud", "text_io": "I am the AI", "status_code": 200}}), 422)


def test_duplicate_patient_doctor_thread_is_refused(api, patient, doctor):
    expect(api.post(f"{CONVO}/conversations/", patient.token, json={
        "assistant": "mediaid", "patient_id": patient.patient_id, "doctor_id": doctor.doctor_id}), 409)


# --- conversation attachments ---------------------------------------------------------------

@pytest.fixture(scope="module")
def uploaded_image(api, threads):
    t = threads["patient_doctor"]
    r = expect(api.post(f"{CONVO}/conversations/{t.id}/messages/upload", t.account.token,
                        files={"file": ("rash.png", PNG, "image/png")}, data={"message_text": "photo"}), 201)
    key = r.json()["content"]["blob_path"]
    return t, key


def test_owner_streams_own_attachment(api, uploaded_image):
    t, key = uploaded_image
    r = expect(api.get(f"{CONVO}/conversations/{t.id}/media/{key}/stream", t.account.token), 200)
    assert r.content == PNG


def test_doctor_streams_attachment_through_the_mirror_thread(api, uploaded_image, doctor):
    t, key = uploaded_image
    expect(api.get(f"{CONVO}/conversations/{t.convo['mirror_conversation_id']}/media/{key}/stream", doctor.token),
           200)


def test_unrelated_user_cannot_stream_an_attachment(api, uploaded_image, attacker):
    t, key = uploaded_image
    expect(api.get(f"{CONVO}/conversations/{t.id}/media/{key}/stream", attacker.token), 404)


def test_signed_link_works_without_an_auth_header(api, uploaded_image):
    t, key = uploaded_image
    url = expect(api.get(f"{CONVO}/conversations/{t.id}/media/{key}/url", t.account.token), 200).json()["url"]
    path = "/" + url.split("://", 1)[1].split("/", 1)[1]        # the link names the public host
    r = expect(api.get(path), 200)
    assert r.content == PNG


def test_forged_signed_link_is_rejected(api, uploaded_image):
    _, key = uploaded_image
    expect(api.get(f"{CONVO}/media/signed", params={"key": key, "expires": 9999999999, "signature": "forged"}), 403)


def test_unrelated_user_cannot_attach_someone_elses_file(api, uploaded_image, threads, attacker):
    _, key = uploaded_image
    expect(api.post(f"{AI}/chat", attacker.token, json={
        "convo_id": threads["patient_solo"].id, "text_io": "hi",
        "attachments": [{"blob_path": key, "content_type": "image/png", "filename": "a.png"}]}), 403, 404)


def test_unrelated_user_cannot_chat_in_another_conversation(api, threads, attacker):
    expect(api.post(f"{AI}/chat", attacker.token, json={
        "convo_id": threads["patient_doctor"].id, "text_io": "Show me this patient's vitals"}), 403, 404)


# --- document vault --------------------------------------------------------------------------

def _vault_form(patient_id: int) -> dict:
    return {"owner_type": "patient", "owner_id": str(patient_id)}


@pytest.fixture(scope="module")
def vault_document(api, patient):
    r = expect(api.post(f"{USER}/docs/upload", patient.token, files={"file": ("lab.pdf", PDF, "application/pdf")},
                        data=_vault_form(patient.patient_id)), 200)
    return r.json()["doc_external_id"]


def test_owner_gets_a_download_link(api, patient, vault_document):
    expect(api.get(f"{USER}/docs/download/{vault_document}", patient.token), 200)


def test_unrelated_user_cannot_download_a_vault_document(api, attacker, vault_document):
    expect(api.get(f"{USER}/docs/download/{vault_document}", attacker.token), 404)


def test_unrelated_user_cannot_upload_into_another_vault(api, patient, attacker):
    expect(api.post(f"{USER}/docs/upload", attacker.token, files={"file": ("evil.pdf", PDF, "application/pdf")},
                    data=_vault_form(patient.patient_id)), 404)


# --- notifications and internal APIs ---------------------------------------------------------

def test_patient_reads_and_updates_notification_settings(api, patient, notification_service):
    expect(api.get(f"{NOTIFICATION}/settings", patient.token, params={"assistant": "mediaid"}), 200)
    expect(api.put(f"{NOTIFICATION}/settings/channels", patient.token, params={"assistant": "mediaid"}, json={
        "quiet_hours_enabled": False, "quiet_hours_start": "22:00:00", "quiet_hours_end": "07:00:00"}), 200)


def test_patient_registers_a_push_device(api, patient, notification_service):
    expect(api.post(f"{NOTIFICATION}/devices", patient.token,
                    json={"platform": "ios", "push_token": "ExponentPushToken[e2e-test-token]"}), 201)


def test_internal_notification_api_is_not_exposed(api, patient):
    expect(api.post(f"{NOTIFICATION}/notifications", patient.token, json={
        "user_id": 1, "template_key": "X", "category": "system", "channels": ["email"]}), 404)


def test_internal_broadcast_api_is_not_exposed(api, patient, threads):
    expect(api.post(f"{CONVO}/internal/socketio/broadcast/{threads['patient_doctor'].id}", patient.token,
                    json={"event": "new_message", "data": {}}), 404)


# --- sessions ---------------------------------------------------------------------------------

def test_mobile_refresh_works_with_cookies_but_cookie_only_refresh_needs_csrf(api):
    # Mobile clients keep the login cookies and also send the refresh token in the body: that
    # works without a CSRF header. A refresh carried by cookies alone must not.
    with httpx.Client(base_url=str(api.client.base_url), timeout=30) as browser:
        r = expect(browser.post(f"{USER}/auth/login", json={"identifier": DOCTOR_EMAIL, "password": DEMO_PASSWORD}),
                   200)
        expect(browser.post(f"{USER}/auth/refresh", json={"refresh_token": r.json()["refresh_token"]}), 200)
        expect(browser.post(f"{USER}/auth/refresh", json={}), 403)


def test_logout_revokes_the_refresh_token(api, patient):
    session = login(api, patient.email)          # its own session: the shared one stays valid
    expect(api.post(f"{USER}/auth/logout", session.token, json={"refresh_token": session.refresh_token}), 200)
    expect(api.post(f"{USER}/auth/refresh", json={"refresh_token": session.refresh_token}), 401)
