# doctor_profile.py
"""
MediShow tool for navigating to a doctor profile (patient-facing).
"""

from agents import function_tool
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError
from medicus_common.models.medical.context import MedicalContext, SessionContext


@function_tool
async def show_doctor_page(
    medical_context: MedicalContext,
    session_context: SessionContext,
) -> dict:
    """
    Used by MediAid.
    Triggers UI navigation to the doctor profile page.
    """
    if not medical_context.doctor_id:
        raise ValidationError("Doctor context is required to show doctor profile")

    logger.info(
        "MediShow(show_doctor_page): navigating to doctor profile",
        extra={"doctor_id": medical_context.doctor_id},
    )

    return {
        "action": "navigate",
        "target": "doctor_profile",
        "doctor_id": medical_context.doctor_id,
    }
