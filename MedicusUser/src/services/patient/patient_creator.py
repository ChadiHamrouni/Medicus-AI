"""Patient creation logic."""

from typing import Optional, Union
from datetime import date, datetime, timezone

from medicus_common.models.patient import PatientResponse, PatientStatus
from medicus_common.models.common import Gender
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger



async def create_patient_impl(
    db_manager,
    patient_service,
    wa_number: str,
    first_name: str,
    last_name: str,
    user_id: Optional[int] = None,
    gender: Optional[Gender] = None,
    dob: Optional[Union[str, date]] = None,
    country_id: int = 1,
    language_id: int = 1
) -> PatientResponse:
    """Create a new patient record.

    Args:
        db_manager: Database manager instance
        patient_service: Patient service instance for get_patient_by_id
        wa_number: WhatsApp number (unique identifier)
        first_name: Patient's first name
        last_name: Patient's last name
        user_id: Optional user ID from auth system
        gender: Optional patient gender
        dob: Optional date of birth (YYYY-MM-DD)
        country_id: Country ID (defaults to 1)
        language_id: Language ID (defaults to 1)

    Returns:
        PatientResponse: Created patient data

    Raises:
        ValidationError: If wa_number already exists or validation fails
        DatabaseError: If database operation fails
    """

    try:
        # Check if WhatsApp number already exists
        existing = await db_manager.fetchrow(
            "SELECT id FROM public.patients_view WHERE wa_number = $1",
            wa_number
        )
        if existing:
            raise ValidationError("WhatsApp number already registered")

        # Insert new patient
        query = """
            INSERT INTO public.patients (
                wa_number, first_name, last_name, user_id, gender, dob,
                country_id, language_id, status, created_at, updated_at,
                contact, metadata, emergency_contact
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, created_at
        """

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Convert dob to date object if provided
        dob_date = None
        if dob:
            try:
                # Handle both string and date object inputs
                if isinstance(dob, str):
                    # Parse YYYY-MM-DD format string to date object
                    dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
                    logger.info(f"Converted DOB string '{dob}' to date object: {dob_date}")
                elif hasattr(dob, 'year'):  # datetime.date object
                    dob_date = dob
                    logger.info(f"Using DOB date object: {dob_date}")
                else:
                    raise ValueError(f"Invalid DOB type: {type(dob)}")
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid DOB format '{dob}': {e}")
                raise ValidationError(f"Invalid date of birth format. Expected YYYY-MM-DD string or date object, got: {dob}")

        # Map gender to database enum
        gender_db = None
        if gender:
            from .patient_service import PatientService
            gender_db = PatientService._map_gender_to_db(gender)

        result = await db_manager.fetchrow(
            query,
            wa_number,
            first_name,
            last_name,
            user_id,
            gender_db,
            dob_date,
            country_id,
            language_id,
            PatientStatus.ACTIVE.value,
            now,
            now,
            '{}',  # empty contact JSON
            '{}',  # empty metadata JSON
            '{}'   # empty emergency_contact JSON
        )

        # Fetch the complete patient record
        patient = await patient_service.get_patient_by_id(result['id'])

        return patient

    except Exception as e:
        logger.error(f"Error creating patient: {e}")
        raise DatabaseError("Failed to create patient")