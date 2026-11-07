from typing import Dict, Any

from agents import function_tool
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError
from medicus_common.models.patient.patient_view import PatientProfileDetailsResponse
from src.services.patient.patient_details_service import get_patient_details


@function_tool
async def get_patient_profile_details(
    patient_id: int
) -> PatientProfileDetailsResponse:
    """
    Retrieve patient's profile details and care preferences.

    INTENT
    ------
    Use this tool when you need detailed information about a patient's:
    - Extended insurance details (coverage plans, copay info, deductibles)
    - Family medical history metadata
    - Care team preferences (preferred hospital, preferred specialists)
    - Communication preferences (language for documents, accessibility needs)
    - Advanced directives and consent metadata
    - Dependent relationships (if main account holder)

    This tool queries the patients_view materialized view.

    STATE TRANSITION
    ----------------
    - Read-only retrieval from patients_view.
    - Returns profile detail data.
    - Data is cached for 5 minutes.

    PARAMETERS
    ----------
    patient_id : int
        Identifier of the patient.

    RETURNS
    -------
    PatientProfileDetailsResponse
        Patient profile details including:
        - insurance_details: Extended insurance information
        - family_history_metadata: Family medical history structure
        - care_preferences: Preferred providers and facilities
        - communication_preferences: Language, accessibility, contact preferences
        - advance_directives: DNR, living will, healthcare proxy info
        - dependent_info: Information about dependents (if applicable)

    HARD RULES
    ----------
    - Fetches from patients_view.
    - Returns None if patient not found.
    - DO NOT use this for basic identity (name, age, gender) - that's in LIGHT context.
    - DO NOT use this for clinical data (vitals, conditions, medications) - use specific clinical tools.
    - USE this for profile details, insurance, preferences, and care coordination data.
    """

    try:
        details = await get_patient_details(patient_id)

        if not details:
            return PatientProfileDetailsResponse(
                patient_id=patient_id,
                found=False,
                message="Patient details not found"
            )

        return PatientProfileDetailsResponse(
            patient_id=patient_id,
            found=True,
            **details.model_dump()
        )

    except Exception as e:
        logger.error_with_context("Failed get_patient_profile_details", error=str(e), patient_id=patient_id)
        raise DatabaseError(f"Failed to retrieve patient profile details: {str(e)}")
