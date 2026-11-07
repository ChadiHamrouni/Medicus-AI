from typing import Dict, Any
from agents import function_tool

from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError
from medicus_common.models.doctor.doctor_view import DoctorProfileDetailsResponse

from src.services.doctor.doctor_details_service import get_doctor_details


@function_tool
async def get_doctor_profile_details(
    doctor_id: int
) -> DoctorProfileDetailsResponse:
    """
    Retrieve doctor's practice details and profile information.

    INTENT
    ------
    Use this tool when you need detailed information about a doctor's:
    - Medical credentials (license, certifications)
    - Practice details (procedures offered, working hours)
    - Location information (address, other locations)
    - Contact information
    - Additional specialties and languages

    This tool queries the doctors_details_view materialized view.

    STATE TRANSITION
    ----------------
    - Read-only retrieval from doctors_details_view.
    - Returns profile detail data.
    - Data is cached for 5 minutes.

    PARAMETERS
    ----------
    doctor_id: int
        Identifier of the doctor.

    RETURNS
    -------
    DoctorProfileDetailsResponse
        Doctor profile details including:
        - medical_licence: License number
        - medical_procedures: List of procedures offered with pricing
        - certifications: Board certifications and credentials
        - languages: Language IDs the doctor speaks
        - other_specialties: Additional specialty IDs
        - working_hours: Practice hours by day
        - other_locations: Additional practice locations
        - contact: Contact information (email, phone, website)
        - address: Primary practice address

    HARD RULES
    ----------
    - Fetches from doctors_details_view (NOT doctors_view LIGHT).
    - Returns None if doctor not found.
    - DO NOT use this for basic identity (name, specialty, country) - that's in LIGHT context.
    - USE this for profile details, credentials, working hours, locations.
    """

    try:
        details = await get_doctor_details(doctor_id)

        if not details:
            return DoctorProfileDetailsResponse(
                doctor_id=doctor_id,
                found=False,
                message="Doctor details not found"
            )

        fields = {k: v for k, v in details.model_dump().items() if k in DoctorProfileDetailsResponse.model_fields}
        fields.update(doctor_id=doctor_id, found=True)
        return DoctorProfileDetailsResponse(**fields)

    except Exception as e:
        logger.error_with_context("Failed get_doctor_details", error=str(e), doctor_id=doctor_id)
        raise DatabaseError(f"Failed to retrieve doctor details: {str(e)}")
