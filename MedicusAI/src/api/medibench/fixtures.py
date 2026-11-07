import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager
from .common import BASE_DIR

router = APIRouter(prefix="/fixtures", tags=["fixtures"])

FIXTURES_FILE = BASE_DIR / "tests" / "scenarios" / "fixtures.json"

def _load_fixtures() -> list:
    if FIXTURES_FILE.exists():
        try:
            return json.loads(FIXTURES_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []

def _save_fixtures(fixtures: list) -> None:
    FIXTURES_FILE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURES_FILE.write_text(json.dumps(fixtures, indent=2), encoding="utf-8")

@router.get("/config")
def get_fixture_config():
    return _load_fixtures()

class FixtureUpdateBody(BaseModel):
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    sender_id: Optional[int] = None
    conversation_id: Optional[str] = None
    mirror_conversation_id: Optional[str] = None

@router.put("/config/{assistant}")
def save_fixture_config(assistant: str, body: FixtureUpdateBody):
    fixtures = _load_fixtures()
    existing = next((f for f in fixtures if f.get("assistant") == assistant), {})
    updated = {**existing, "assistant": assistant}
    
    for field, value in body.model_dump(exclude_unset=True).items():
        updated[field] = value

    fixtures = [f for f in fixtures if f.get("assistant") != assistant]
    fixtures.append(updated)
    _save_fixtures(fixtures)
    return {"ok": True}

@router.get("/doctors")
async def list_doctors(patient_id: Optional[int] = None):
    try:
        if patient_id:
            # medidoc
            rows = await db_manager.fetch(
                """
                SELECT DISTINCT ON (cv.doctor_name, d.specialty_name, c.doctor_id)
                    c.doctor_id AS id,
                    cv.doctor_name || ' (' || COALESCE(d.specialty_name, 'No Specialty') || ')' AS name,
                    c.id AS conversation_id, c.mirror_conversation_id,
                    c.user_id AS sender_id
                FROM dialog.conversations c
                JOIN dialog.conversations_view cv ON cv.id = c.id
                LEFT JOIN public.doctors_view d ON d.id = c.doctor_id
                WHERE c.doctor_id IS NOT NULL
                  AND c.patient_id = $1
                ORDER BY cv.doctor_name ASC, d.specialty_name ASC
                LIMIT 200
                """,
                patient_id,
            )
        else:
            # docsolo - get all doctors involved in any conversation
            rows = await db_manager.fetch(
                """
                SELECT DISTINCT ON (cv.doctor_name, d.specialty_name, c.doctor_id)
                    c.doctor_id AS id,
                    cv.doctor_name || ' (' || COALESCE(d.specialty_name, 'No Specialty') || ')' AS name,
                    c.id AS conversation_id,
                    c.user_id AS sender_id
                FROM dialog.conversations c
                JOIN dialog.conversations_view cv ON cv.id = c.id
                LEFT JOIN public.doctors_view d ON d.id = c.doctor_id
                WHERE c.doctor_id IS NOT NULL
                ORDER BY cv.doctor_name ASC, d.specialty_name ASC
                LIMIT 200
                """
            )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to list doctors: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients")
async def list_patients(doctor_id: Optional[int] = None):
    try:
        if doctor_id:
            rows = await db_manager.fetch(
                """
                SELECT DISTINCT ON (cv.patient_name, p.gender, p.current_age, c.patient_id)
                    c.patient_id AS id,
                    cv.patient_name || ' (' || COALESCE(p.gender::text, '?') || ' ' || COALESCE(p.current_age::text, '?') || ')' AS name,
                    c.id AS conversation_id, c.mirror_conversation_id,
                    c.user_id AS sender_id
                FROM dialog.conversations c
                JOIN dialog.conversations_view cv ON cv.id = c.id
                LEFT JOIN public.patients_view p ON p.id = c.patient_id
                WHERE c.patient_id IS NOT NULL
                  AND c.doctor_id = $1
                ORDER BY cv.patient_name ASC, p.current_age DESC
                LIMIT 200
                """,
                doctor_id,
            )
        else:
            rows = await db_manager.fetch(
                """
                SELECT DISTINCT ON (cv.patient_name, p.gender, p.current_age, c.patient_id)
                    c.patient_id AS id,
                    cv.patient_name || ' (' || COALESCE(p.gender::text, '?') || ' ' || COALESCE(p.current_age::text, '?') || ')' AS name,
                    c.id AS conversation_id,
                    c.user_id AS sender_id
                FROM dialog.conversations c
                JOIN dialog.conversations_view cv ON cv.id = c.id
                LEFT JOIN public.patients_view p ON p.id = c.patient_id
                WHERE c.patient_id IS NOT NULL
                ORDER BY cv.patient_name ASC, p.current_age DESC
                LIMIT 200
                """
            )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to list patients: {e}")
        raise HTTPException(status_code=500, detail=str(e))
