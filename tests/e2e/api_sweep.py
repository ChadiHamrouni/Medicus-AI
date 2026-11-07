"""Calls every User/Convo/AI endpoint as the demo patient and doctor and checks status codes.

Run against a stack with demo data:  python tests/e2e/api_sweep.py [gateway_url]
"""
import json, sys, urllib.request, urllib.error

G = sys.argv[1] if len(sys.argv) > 1 else f"http://localhost:{__import__('os').environ.get('GATEWAY_PORT', '8080')}"
U, C, A = "/api/MedicusUser", "/api/MedicusConvo", "/api/MedicusAI"
results = []


def call(method, path, tok=None, body=None, expect=None, raw=False):
    h = {"Content-Type": "application/json"}
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(G + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            status, text = r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode(errors="replace")
    ok = status < 500 and (expect is None or status in (expect if isinstance(expect, tuple) else (expect,)))
    results.append((ok, method, path, status, text[:160]))
    try:
        return status, json.loads(text) if text else None
    except ValueError:
        return status, text


def login(email):
    s, b = call("POST", f"{U}/auth/login", body={"identifier": email, "password": "MedicusDemo123!"}, expect=200)
    return b


p = login("patient@example.com"); d = login("doctor@example.com")
pt, dt = p["access_token"], d["access_token"]

# ---- discover ids
_, me = call("GET", f"{U}/patients/me", pt, expect=200)
pid = (me or {}).get("id") or (me or {}).get("patient", {}).get("id") if isinstance(me, dict) else None
_, dprof = call("GET", f"{U}/doctor/profile", dt, expect=200)
did = None
if isinstance(dprof, dict):
    did = dprof.get("id") or dprof.get("doctor_id") or (dprof.get("doctor") or {}).get("id")
print("patient id", pid, "doctor id", did)
pid = pid or 1; did = did or 1

# ---- user service GETs
for path, tok, exp in [
    (f"{U}/users/me", pt, 200), (f"{U}/users/me", dt, 200),
    (f"{U}/doctor/search?query=Amina", pt, 200), (f"{U}/doctor/search", pt, 200),
    (f"{U}/doctor/search/oon", pt, 200),
    (f"{U}/doctor/{did}", pt, 200), (f"{U}/doctor/{did}/public-profile", pt, 200),
    (f"{U}/doctor/{did}/events", dt, 200), (f"{U}/doctor/{did}/events", pt, (403, 404)),
    (f"{U}/reference/specialty-super-categories", pt, 200), (f"{U}/reference/specialties", pt, 200),
    (f"{U}/reference/languages", pt, 200), (f"{U}/reference/countries", pt, 200),
    (f"{U}/dependents/", pt, 200), (f"{U}/dependents/context/available", pt, 200),
    (f"{U}/patients/{pid}", pt, 200), (f"{U}/patients/{pid}", dt, 200),
    (f"{U}/medications/patients/{pid}", pt, 200), (f"{U}/medications/patients/{pid}", dt, 200),
    (f"{U}/medications/patients/{pid}/summary", pt, 200), (f"{U}/medications/patients/{pid}/summary", dt, 200),
    (f"{U}/procedures/patients/{pid}", pt, 200), (f"{U}/notes/patients/{pid}", pt, 200),
    (f"{U}/medical-events/patients/{pid}", pt, 200), (f"{U}/vitals/patients/{pid}", pt, 200),
    (f"{U}/conditions/patients/{pid}", pt, 200),
    (f"{U}/benchmark/doctor/{did}/latest", dt, (200, 404)), (f"{U}/benchmark/doctor/{did}/summary", dt, (200, 404)),
    (f"{U}/benchmark/doctor/{did}/history", dt, 200), (f"{U}/benchmark/health", dt, 200),
    (f"{U}/docs/vault/patient/{pid}", pt, 200), (f"{U}/docs/shared/patient/{pid}", pt, 200),
    (f"{U}/docs/vault/doctor/{did}", dt, 200), (f"{U}/docs/shared/doctor/{did}", dt, 200),
]:
    call("GET", path, tok, expect=exp)

# vitals history needs a vital id
_, vit = call("GET", f"{U}/vitals/patients/{pid}", pt)
vid = None
try:
    items = vit if isinstance(vit, list) else (vit.get("vitals") or vit.get("data") or [])
    vid = items[0].get("vital_id")
except Exception:
    pass
print("vital id", vid)
if vid:
    call("GET", f"{U}/vitals/patients/{pid}/history/{vid}", pt, expect=200)

# ---- user service writes
call("PUT", f"{U}/patients/{pid}/emergency-contact", pt,
     [{"name": "Alex Rivera", "relationship": "spouse", "phone_number": "+15550000003"}], expect=200)
call("PUT", f"{U}/patients/{pid}/metadata", pt, {"theme": "dark"}, expect=200)
call("PUT", f"{U}/patients/{pid}/medical-data", pt, {"blood_type": "O+"}, expect=200)
call("PUT", f"{U}/patients/{pid}", pt, {"first_name": "Sam"}, expect=200)
call("PUT", f"{U}/patients/{pid}", dt, {"first_name": "Hacker"}, expect=(403, 404))
call("PUT", f"{U}/doctor/working-hours", dt, [{"day_of_week": "Monday", "is_available": True,
     "time_slots": [{"start_time": "09:00", "end_time": "17:00"}]}], expect=200)
call("PUT", f"{U}/doctor/procedures", dt, {"medical_procedures": [{"procedure_name": "General consultation", "procedure_price": "60"}], "currency": "USD"}, expect=200)
call("PUT", f"{U}/doctor/contact-info", dt, {"professional_email": "doctor@example.com", "professional_phone": "+15550000001"}, expect=200)
call("PUT", f"{U}/doctor/practice-info", dt, {"address_line_1": "100 Demo Street", "city": "Springfield", "state": "IL", "zip_code": "62701"}, expect=200)
call("PUT", f"{U}/doctor/locations", dt, [{"address_line_1": "200 Second St", "city": "Springfield", "location_name": "Annex", "is_primary": False}], expect=200)
call("PUT", f"{U}/doctor/additional-info", dt, {"about_you": "Family doctor", "gender": "FEMALE"}, expect=200)
call("PUT", f"{U}/doctor/additional-links", dt, {"additional_links": [{"website_name": "Clinic", "website_url": "https://example.com"}]}, expect=200)
call("PUT", f"{U}/doctor/professional-info", dt, {"medical_school": "Demo University", "graduation_year": 2010, "certifications": [{"title": "Board certified", "certif_date": "2014-01-01"}]}, expect=200)
s, dep = call("POST", f"{U}/dependents/create", pt, {"first_name": "Mia", "last_name": "Rivera", "dob": "2018-03-03",
                                                     "gender": "female", "relationship": "child"}, expect=(200, 201))
dep_id = None
if isinstance(dep, dict):
    dep_id = dep.get("id") or dep.get("patient_id") or (dep.get("dependent") or dep.get("patient") or {}).get("id")
print("dependent", dep_id)
if dep_id:
    call("GET", f"{U}/dependents/{dep_id}", pt, expect=200)
    call("PUT", f"{U}/dependents/{dep_id}", pt, {"first_name": "Mia"}, expect=200)
    call("POST", f"{U}/dependents/switch-context", pt, {"patient_id": dep_id}, expect=200)
    call("GET", f"{U}/dependents/{dep_id}", dt, expect=(403, 404))
    call("DELETE", f"{U}/dependents/{dep_id}", pt, expect=(200, 204))
call("PUT", f"{U}/me", pt, {"phone": "+15550000002"}, expect=200)
call("POST", f"{U}/support/request", pt, {"patient_id": str(pid), "reason": "test"}, expect=403)
call("POST", f"{U}/auth/send-verification-code", pt, {"email": "patient@example.com", "code_type": "email_verification"}, expect=(200, 400, 422))
call("POST", f"{U}/auth/request-password-reset", None, {"identifier": "patient@example.com"}, expect=200)

# ---- convo
_, pc = call("GET", f"{C}/conversations/", pt, expect=200)
_, dc = call("GET", f"{C}/conversations/", dt, expect=200)  # role default -> medidoc
pconvs = pc.get("conversations", []) if isinstance(pc, dict) else []
dconvs = dc.get("conversations", []) if isinstance(dc, dict) else []
print("patient convos", [(c.get("assistant"), c.get("doctor_id")) for c in pconvs])
print("doctor convos", [(c.get("assistant"), c.get("patient_id")) for c in dconvs])
for c in pconvs + dconvs:
    tok = pt if c in pconvs else dt
    cid = c["id"]
    call("GET", f"{C}/conversations/{cid}/", tok, expect=200)
    call("GET", f"{C}/conversations/{cid}/context", tok, expect=200)
    call("GET", f"{C}/conversations/{cid}/summary", tok, expect=((200,) if c.get('patient_id') else (404,)) if tok == dt else 403)
    call("GET", f"{C}/conversations/{cid}/messages", tok, expect=200)
call("GET", f"{C}/conversations/search?q=Sam", dt, expect=200)
call("GET", f"{C}/conversations/search?q=Amina", pt, expect=200)
call("GET", f"{C}/client/config", pt, expect=200)
call("GET", f"{C}/client/compatibility/1.0.0", pt, expect=200)
pair = next((c for c in pconvs if c.get("doctor_id")), None)
if pair:
    s, m = call("POST", f"{C}/conversations/{pair['id']}/messages", pt,
                {"payload": {"type": "app", "text_io": "Hello doctor, sweep test", "assistant": "mediaid"}}, expect=(200, 201))
    print("send message ->", s, str(m)[:200])
    if dconvs:
        call("GET", f"{C}/conversations/{dconvs[0]['id']}/messages", pt, expect=(403, 404))

# ---- ai input validation (no model server): must be a clean 4xx, never 5xx
solo = next((c for c in pconvs if not c.get("doctor_id")), None)
if solo:
    call("POST", f"{A}/chat", pt, {"convo_id": solo["id"], "text_io": "hi"}, expect=(200, 400, 503))
call("POST", f"{A}/chat", pt, {"convo_id": "00000000-0000-0000-0000-000000000000", "text_io": "hi"}, expect=(403, 404))
call("POST", f"{A}/realtime/token", dt, {}, expect=(403, 404, 422, 503))

bad = [r for r in results if not r[0]]
for ok, m, path, s, t in results:
    print(("OK  " if ok else "FAIL"), s, m, path, "" if ok else "| " + t)
print(f"\n{len(results) - len(bad)}/{len(results)} as expected")
sys.exit(1 if bad else 0)
