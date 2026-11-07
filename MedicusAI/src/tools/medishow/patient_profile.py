# patient_profile.py
"""
MediShow tool for navigating to a patient profile (doctor-facing).
"""

from agents import function_tool
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError
from medicus_common.models.medical.context import MedicalContext, SessionContext


@function_tool
async def show_patient_page(
    medical_context: MedicalContext,
    session_context: SessionContext,
) -> dict:
    """
    Used by MediDoc.
    Triggers UI navigation to the patient profile page.
    """
    if not medical_context.patient_id:
        raise ValidationError("Patient context is required to show patient profile")

    logger.info(
        "MediShow(show_patient_page): navigating to patient profile",
        extra={"patient_id": medical_context.patient_id},
    )

    return {
        "action": "navigate",
        "target": "patient_profile",
        "patient_id": medical_context.patient_id,
    }
