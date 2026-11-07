import hmac
import os
from pathlib import Path
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader
from src.assistants.medidoc.medidoc_agent import medidoc
from src.assistants.docsolo.docsolo_agent import docsolo
from src.assistants.mediaid.mediaid_agent import mediaid
from src.assistants.medisolo.medisolo_agent import medisolo

api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)

def medibench_enabled() -> bool:
    """The evaluation API can rewrite assistant prompts, so it only exists when explicitly configured."""
    return bool(os.getenv("MEDIBENCH_API_KEY"))


async def verify_internal_api_key(api_key: str = Security(api_key_header)):
    expected_key = os.getenv("MEDIBENCH_API_KEY")
    if not expected_key or not hmac.compare_digest(api_key.encode(), expected_key.encode()):
        raise HTTPException(status_code=403, detail="Invalid internal API key")

ASSISTANT_MAP = {
    "medidoc": medidoc,
    "docsolo": docsolo,
    "mediaid": mediaid,
    "medisolo": medisolo,
}

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
# Ensure we are actually at the root (should contain src and tests)
if not (BASE_DIR / "src").exists() or not (BASE_DIR / "tests").exists():
    # Fallback to CWD if the relative path doesn't look right
    BASE_DIR = Path.cwd()
