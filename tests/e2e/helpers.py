"""HTTP client, accounts and container access shared by the end-to-end tests."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[2]

USER = "/api/MedicusUser"
CONVO = "/api/MedicusConvo"
AI = "/api/MedicusAI"
NOTIFICATION = "/api/MedicusNotification"

DEMO_PASSWORD = "MedicusDemo123!"
PATIENT_EMAIL = "patient@example.com"
DOCTOR_EMAIL = "doctor@example.com"


def _root_env(key: str) -> str | None:
    """One value from the repository's .env, so the suite finds the gateway docker compose uses."""
    env = ROOT / ".env"
    if not env.exists():
        return None
    for line in env.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


BASE_URL = os.environ.get("E2E_BASE_URL") or (
    f"http://localhost:{os.environ.get('GATEWAY_PORT') or _root_env('GATEWAY_PORT') or '8080'}")
MAILPIT_URL = os.environ.get("E2E_MAILPIT_URL", "http://localhost:8025")


class Api:
    """Thin wrapper over httpx that never carries cookies from one call to the next.

    Login responses set auth cookies; keeping them would let a request made "as the attacker"
    silently authenticate as the previous user and hide an authorization bug.
    """

    def __init__(self, base_url: str = BASE_URL, timeout: float = 120):
        self.client = httpx.Client(base_url=base_url, timeout=timeout)

    def request(self, method: str, path: str, token: str | None = None, **kwargs: Any) -> httpx.Response:
        headers = dict(kwargs.pop("headers", None) or {})
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            return self.client.request(method, path, headers=headers, **kwargs)
        finally:
            self.client.cookies.clear()

    def get(self, path: str, token: str | None = None, **kw: Any) -> httpx.Response:
        return self.request("GET", path, token, **kw)

    def post(self, path: str, token: str | None = None, **kw: Any) -> httpx.Response:
        return self.request("POST", path, token, **kw)

    def put(self, path: str, token: str | None = None, **kw: Any) -> httpx.Response:
        return self.request("PUT", path, token, **kw)

    def delete(self, path: str, token: str | None = None, **kw: Any) -> httpx.Response:
        return self.request("DELETE", path, token, **kw)

    def close(self) -> None:
        self.client.close()


def expect(response: httpx.Response, *statuses: int) -> httpx.Response:
    """Assert the status is one of `statuses` (and never a server error) with a readable message."""
    status = response.status_code
    assert status < 500 and status in statuses, (
        f"{response.request.method} {response.request.url.path} returned {status}, "
        f"expected {' or '.join(map(str, statuses))}: {response.text[:300]}")
    return response


@dataclass
class Account:
    email: str
    token: str
    refresh_token: str
    role: str
    patient_id: int | None = None
    doctor_id: int | None = None


def login(api: Api, email: str, password: str = DEMO_PASSWORD) -> Account:
    body = expect(api.post(f"{USER}/auth/login", json={"identifier": email, "password": password}), 200).json()
    return Account(email=email, token=body["access_token"], refresh_token=body["refresh_token"],
                   role=body["user"]["role"],
                   patient_id=(body.get("patientProfile") or {}).get("id"),
                   doctor_id=(body.get("doctorProfile") or {}).get("id"))


def register_patient(api: Api) -> Account:
    """A brand-new patient with no relationship to the demo records."""
    email = f"e2e-{uuid.uuid4().hex[:10]}@example.com"
    r = expect(api.post(f"{USER}/auth/register", json={
        "email": email, "password": "Att4ckerPass!", "role": "patient",
        "first_name": "Mallory", "last_name": "Example", "dob": "1990-01-01", "gender": "female"}), 201)
    body = r.json()
    return Account(email=email, token=body["access_token"], refresh_token=body.get("refresh_token", ""),
                   role="patient", patient_id=(body.get("patientProfile") or {}).get("id"))


@dataclass
class Thread:
    """One of the four conversation types the assistants run in."""

    kind: str                      # patient_doctor, patient_solo, doctor_patient, doctor_solo
    account: Account
    assistant: str                 # mediaid (patient side) or medidoc (doctor side)
    convo: dict = field(repr=False)

    @property
    def id(self) -> str:
        return self.convo["id"]

    @property
    def paired(self) -> bool:
        return bool(self.convo.get("patient_id") and self.convo.get("doctor_id"))


# --- the ai container ---------------------------------------------------------------------

class AiContainer:
    """Runs code inside the running `ai` service, where the assistants' tools and database live."""

    def __init__(self) -> None:
        self.compose = ["docker", "compose", "--project-directory", str(ROOT)]

    @staticmethod
    def available() -> str | None:
        """None when usable, otherwise the reason it is not."""
        if not shutil.which("docker"):
            return "docker is not installed"
        ps = subprocess.run(["docker", "compose", "--project-directory", str(ROOT), "ps", "-q", "ai"],
                            capture_output=True, text=True)
        if ps.returncode != 0 or not ps.stdout.strip():
            return "the ai service is not running (docker compose up -d ai)"
        return None

    def put_file(self, local: Path, remote: str) -> None:
        with open(local, "rb") as f:
            subprocess.run([*self.compose, "exec", "-T", "ai", "sh", "-c", f"cat > {remote}"],
                           stdin=f, check=True, capture_output=True)

    def run(self, *argv: str, stdin: str | None = None, env: dict | None = None, timeout: float = 900,
            detach: bool = False) -> subprocess.CompletedProcess:
        env_flags = [x for k, v in (env or {}).items() for x in ("-e", f"{k}={v}")]
        return subprocess.run([*self.compose, "exec", "-T", *(["-d"] if detach else []), *env_flags, "ai", *argv],
                              input=stdin, capture_output=True, text=True, encoding="utf-8", errors="replace",
                              timeout=timeout)

    def python_json(self, script: Path, payload: Any, timeout: float = 900) -> Any:
        """Run `script` in the container with `payload` as JSON on stdin; return the last JSON line it prints."""
        remote = f"/tmp/medicus_e2e_{script.name}"
        self.put_file(script, remote)
        proc = self.run("python", remote, stdin=json.dumps(payload), timeout=timeout)
        lines = [line for line in proc.stdout.splitlines() if line.startswith("{") or line.startswith("[")]
        if proc.returncode != 0 or not lines:
            raise RuntimeError(f"{script.name} failed in the ai container (exit {proc.returncode}):\n"
                               f"{proc.stdout[-2000:]}\n{proc.stderr[-3000:]}")
        return json.loads(lines[-1])

    def logs_since(self, since: str) -> list[str]:
        out = subprocess.run([*self.compose, "logs", "ai", "--since", since], capture_output=True, text=True,
                             encoding="utf-8", errors="replace").stdout
        return out.splitlines()

    def sql(self, statement: str) -> None:
        user = os.environ.get("POSTGRES_USER") or _root_env("POSTGRES_USER") or "medicus"
        db = os.environ.get("POSTGRES_DB") or _root_env("POSTGRES_DB") or "medicus"
        subprocess.run([*self.compose, "exec", "-T", "postgres", "psql", "-U", user, "-d", db, "-qc", statement],
                       capture_output=True, check=True)

    def redis(self, *argv: str) -> None:
        subprocess.run([*self.compose, "exec", "-T", "redis", "redis-cli", *argv], capture_output=True, check=True)
