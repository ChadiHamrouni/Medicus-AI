"""
Authorization policy for patient, doctor and document resources.

Read access to a patient's data:
  * the account that owns the patient profile (the user themself, or the
    guardian for a dependent);
  * a doctor with a care relationship (a conversation or an appointment);
  * admins.
Write access to a patient profile: the owning account only.

Denials are reported as 404 so the API does not reveal which ids exist.
"""

from typing import Literal

from fastapi import Depends, HTTPException, status

from medicus_common.core.database import db_manager
from medicus_common.models.user import User, UserRole

from src.api.auth_routes.auth_login import get_current_user

_NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

_PATIENT_READ_SQL = """
SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = $1 AND p.user_id = $2 AND p.deleted_at IS NULL
    UNION ALL
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = $2 AND d.deleted_at IS NULL AND (
        EXISTS (SELECT 1 FROM dialog.conversations c WHERE c.patient_id = $1 AND c.doctor_id = d.id)
        OR EXISTS (SELECT 1 FROM public.medical_visits v WHERE v.patient_id = $1 AND v.doctor_id = d.id)
    )
)
"""


def is_admin(user: User) -> bool:
    return user.role == UserRole.ADMIN


async def can_read_patient(user: User, patient_id: int) -> bool:
    return is_admin(user) or bool(await db_manager.fetchval(_PATIENT_READ_SQL, patient_id, user.id))


async def owns_patient(user: User, patient_id: int) -> bool:
    owner = await db_manager.fetchval(
        "SELECT user_id FROM public.patients WHERE id = $1 AND deleted_at IS NULL", patient_id
    )
    return owner is not None and owner == user.id


async def owns_doctor(user: User, doctor_id: int) -> bool:
    owner = await db_manager.fetchval(
        "SELECT user_id FROM public.doctors WHERE id = $1 AND deleted_at IS NULL", doctor_id
    )
    return owner is not None and owner == user.id


async def owns(user: User, owner_type: Literal["patient", "doctor"], owner_id: int) -> bool:
    return await (owns_patient(user, owner_id) if owner_type == "patient" else owns_doctor(user, owner_id))


async def owns_document(user: User, owner_type: Literal["patient", "doctor"], doc_external_id: str) -> bool:
    if owner_type == "patient":
        sql = """SELECT EXISTS (SELECT 1 FROM docs.patient_docs pd JOIN public.patients p ON p.id = pd.patient_id
                 WHERE pd.external_id = $1::uuid AND pd.deleted_at IS NULL AND p.user_id = $2)"""
    else:
        sql = """SELECT EXISTS (SELECT 1 FROM docs.doctor_docs dd JOIN public.doctors d ON d.id = dd.doctor_id
                 WHERE dd.external_id = $1::uuid AND dd.deleted_at IS NULL AND d.user_id = $2)"""
    try:
        return bool(await db_manager.fetchval(sql, doc_external_id, user.id))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# FastAPI dependencies (bind to the `patient_id` / `doctor_id` path parameter)
# ---------------------------------------------------------------------------

async def patient_reader(patient_id: int, current_user: User = Depends(get_current_user)) -> User:
    if not await can_read_patient(current_user, patient_id):
        raise _NOT_FOUND
    return current_user


async def patient_owner(patient_id: int, current_user: User = Depends(get_current_user)) -> User:
    if not (is_admin(current_user) or await owns_patient(current_user, patient_id)):
        raise _NOT_FOUND
    return current_user


async def doctor_self(doctor_id: int, current_user: User = Depends(get_current_user)) -> User:
    """The doctor themself (private practice data such as agenda and benchmarks)."""
    if not (is_admin(current_user) or await owns_doctor(current_user, doctor_id)):
        raise _NOT_FOUND
    return current_user


async def admin_only(current_user: User = Depends(get_current_user)) -> User:
    if not is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return current_user
