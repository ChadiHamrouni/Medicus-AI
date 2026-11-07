"""Patient retrieval and lookup operations."""

from typing import Optional, Dict, Any

from medicus_common.models.patient import PatientResponse
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger


async def get_connected_patient_impl(db_manager, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Get COMPLETE patient data in single query from patients_view.
    Returns all patient info including names, demographics, location, etc.

    Args:
        db_manager: Database manager instance
        user_id: User ID to look up

    Returns:
        dict with complete patient data or None if not found
    """
    try:
        # LIGHT VIEW QUERY - Identity and static data only
        # Clinical data (vitals, conditions, medications, procedures) must be fetched via dedicated APIs
        # JOIN with users_view to get email and phone_number (matching pattern from other patient retrieval functions)
        query = """
            SELECT
                pv.id, pv.user_id, pv.first_name, pv.last_name, pv.dob, pv.gender, pv.relationship,
                pv.wa_number, pv.country_name, pv.language_name, pv.current_age,
                pv.created_at, pv.updated_at, pv.status,
                u.email, u.phone_number
            FROM public.patients_view pv
            LEFT JOIN auth.users_view u ON pv.user_id = u.id
            WHERE pv.user_id = $1 AND pv.relationship = 'main'
            LIMIT 1
        """

        row = await db_manager.fetchrow(query, user_id)
        if not row:
            return None

        patient_data = {
            'id': row['id'],
            'user_id': row['user_id'],
            'first_name': row['first_name'] or '',
            'last_name': row['last_name'] or '',
            'display_name': f"{row['first_name'] or ''} {row['last_name'] or ''}".strip(),
            'full_name': f"{row['first_name'] or ''} {row['last_name'] or ''}".strip(),
            'dob': row['dob'],
            'gender': row['gender'],
            'relationship': row['relationship'],
            'wa_number': row['wa_number'],
            'phone_number': row.get('phone_number'),
            'email': row.get('email'),
            'country_name': row['country_name'],
            'language_name': row['language_name'],
            'current_age': row.get('current_age'),
            'created_at': row['created_at'],
            'updated_at': row['updated_at'],
            'status': row['status']
        }

        return patient_data

    except Exception as e:
        logger.error(f"Failed to get connected patient for user {user_id}: {str(e)}")
        raise DatabaseError(f"Failed to retrieve connected patient for user {user_id}: {str(e)}")


async def get_patient_by_phone_impl(
    db_manager,
    row_to_patient_response_func,
    phone_number: str
) -> Optional[PatientResponse]:
    """Find patient by phone number.

    Searches for a patient record using their phone number.
    Handles both 'phone_number' and legacy 'wa_number' field names.

    Args:
        db_manager: Database manager instance
        row_to_patient_response_func: Function to convert row to PatientResponse
        phone_number: Patient's phone number to search for

    Returns:
        PatientResponse if patient found, None otherwise

    Raises:
        ValidationError: If phone number format is invalid
        DatabaseError: If database operation fails
    """
    if not phone_number or not phone_number.strip():
        raise ValidationError("Phone number is required")

    phone_number = phone_number.strip()

    try:
        # Query with both possible field names for compatibility
        query = """
            SELECT pv.*, u.email, u.role, u.signup_step
            FROM patients_view pv
            LEFT JOIN auth.users_view u ON pv.user_id = u.id
            WHERE pv.wa_number = $1
            LIMIT 1
        """

        row = await db_manager.fetchrow(query, phone_number)

        if not row:
            logger.info("No patient found with phone number")
            return None

        # Convert database row to PatientResponse
        patient = await row_to_patient_response_func(row)

        return patient

    except Exception as e:
        logger.error("Database error in patient phone lookup")
        raise DatabaseError(f"Failed to search patient by phone: {str(e)}")


async def get_patient_by_id_impl(
    db_manager,
    row_to_patient_response_func,
    patient_id: int
) -> Optional[PatientResponse]:
    """Get patient by ID.

    Retrieves complete patient information by patient ID.

    Args:
        db_manager: Database manager instance
        row_to_patient_response_func: Function to convert row to PatientResponse
        patient_id: ID of the patient to retrieve

    Returns:
        PatientResponse if patient found, None otherwise

    Raises:
        DatabaseError: If database operation fails
    """
    if not patient_id or patient_id <= 0:
        raise ValidationError("Valid patient ID is required")

    logger.info("Retrieving patient by ID")

    try:
        query = """
            SELECT pv.*, u.email, u.role, u.signup_step
            FROM patients_view pv
            LEFT JOIN auth.users_view u ON pv.user_id = u.id
            WHERE pv.id = $1
        """

        row = await db_manager.fetchrow(query, patient_id)

        if not row:
            logger.info("Patient not found by ID")
            return None

        patient = await row_to_patient_response_func(row)

        return patient

    except Exception as e:
        logger.error("Database error retrieving patient by ID")
        raise DatabaseError(f"Failed to retrieve patient: {str(e)}")


async def get_patient_by_user_id_impl(
    db_manager,
    row_to_patient_response_func,
    user_id: int
) -> Optional[PatientResponse]:
    """Get patient by user ID.

    Retrieves complete patient information by user ID from the auth system.

    Args:
        db_manager: Database manager instance
        row_to_patient_response_func: Function to convert row to PatientResponse
        user_id: ID of the user whose patient record to retrieve

    Returns:
        PatientResponse if patient found, None otherwise

    Raises:
        DatabaseError: If database operation fails
    """
    if not user_id or user_id <= 0:
        raise ValidationError("Valid user ID is required")

    try:
        query = """
            SELECT pv.*, u.email, u.role, u.signup_step
            FROM patients_view pv
            LEFT JOIN auth.users_view u ON pv.user_id = u.id
            WHERE pv.user_id = $1 AND pv.relationship = 'main'
            LIMIT 1
        """

        row = await db_manager.fetchrow(query, user_id)

        if not row:
            logger.info("Patient not found by user ID")
            return None

        patient = await row_to_patient_response_func(row)

        return patient

    except Exception as e:
        logger.error("Database error retrieving patient by user ID")
        raise DatabaseError(f"Failed to retrieve patient by user ID: {str(e)}")