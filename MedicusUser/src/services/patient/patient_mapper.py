"""Patient data mapper - converts database rows to PatientResponse objects."""

import json
from typing import Any
from datetime import datetime

from medicus_common.models.patient import PatientResponse, InsuranceCoverage
from medicus_common.models.common import Gender
from medicus_common.core.logging_config import logger

from .patient_utils import transform_legacy_emergency_contact


async def row_to_patient_response(db_manager: Any, row: Any) -> PatientResponse:
    """Convert database row to PatientResponse object.

    Helper method to transform database query results into proper
    PatientResponse objects with proper data type conversion.

    Args:
        db_manager: Database manager instance for additional queries
        row: Database row from patient query

    Returns:
        PatientResponse object
    """
    # Parse JSON fields safely
    insurance_coverage = None
    if row.get('insurance_coverage'):
        try:
            insurance_data = json.loads(row['insurance_coverage'])
            if insurance_data:
                insurance_coverage = InsuranceCoverage(**insurance_data)
        except (json.JSONDecodeError, TypeError, ValueError):
            logger.warning("Invalid insurance coverage JSON")

    metadata = {}
    if row.get('metadata'):
        try:
            metadata = json.loads(row['metadata'])
        except (json.JSONDecodeError, TypeError):
            logger.warning("Invalid metadata JSON")

    # Parse medical_prescriptions from patients_view and enhance with doctor names
    medical_prescriptions = []
    if row.get('medical_prescriptions'):
        try:
            prescriptions_data = json.loads(row['medical_prescriptions'])
            if prescriptions_data and isinstance(prescriptions_data, list):
                # Collect all unique doctor IDs from prescriptions
                doctor_ids = list(set([p['doctor_id'] for p in prescriptions_data if p.get('doctor_id')]))

                # Fetch doctor names in a single query
                doctor_names_map = {}
                if doctor_ids:
                    try:
                        doctor_query = """
                            SELECT id, first_name, last_name
                            FROM doctors_view
                            WHERE id = ANY($1)
                        """
                        doctor_rows = await db_manager.fetch(doctor_query, doctor_ids)
                        doctor_names_map = {
                            row['id']: f"{row['first_name']} {row['last_name']}"
                            for row in doctor_rows
                        }
                    except Exception as e:
                        logger.error(f"Error fetching doctor names for prescriptions: {e}")

                # Enhance each prescription with doctor name
                for prescription in prescriptions_data:
                    if 'doctor_id' in prescription and prescription['doctor_id']:
                        doctor_id = prescription['doctor_id']
                        prescription['prescribed_by'] = doctor_names_map.get(
                            doctor_id,
                            f"Doctor {doctor_id}"  # Fallback if doctor not found
                        )
                    else:
                        prescription['prescribed_by'] = "Unknown Doctor"

                    # Ensure date_prescribed is properly formatted as string
                    if 'date_prescribed' in prescription and prescription['date_prescribed']:
                        date_val = prescription['date_prescribed']
                        if hasattr(date_val, 'isoformat'):
                            prescription['date_prescribed'] = date_val.isoformat()
                        elif isinstance(date_val, str):
                            prescription['date_prescribed'] = date_val
                medical_prescriptions = prescriptions_data
        except (json.JSONDecodeError, TypeError):
            logger.warning("Invalid medical prescriptions JSON")

    # Parse past_medical_visits from patients_view
    past_medical_visits = []
    if row.get('past_medical_visits'):
        try:
            visits_data = json.loads(row['past_medical_visits'])
            if visits_data and isinstance(visits_data, list):
                past_medical_visits = visits_data
        except (json.JSONDecodeError, TypeError):
            logger.warning("Invalid past medical visits JSON")

    # Parse medical_exam_orders from patients_view
    medical_exam_orders = []
    if row.get('medical_exam_orders'):
        try:
            exam_orders_data = json.loads(row['medical_exam_orders'])
            if exam_orders_data and isinstance(exam_orders_data, list):
                medical_exam_orders = exam_orders_data
        except (json.JSONDecodeError, TypeError):
            logger.warning("Invalid medical exam orders JSON")

    # Parse medical_examinations from patients_view
    medical_examinations = []
    if row.get('medical_examinations'):
        try:
            examinations_data = json.loads(row['medical_examinations'])
            if examinations_data and isinstance(examinations_data, list):
                medical_examinations = examinations_data
        except (json.JSONDecodeError, TypeError):
            logger.warning("Invalid medical examinations JSON")

    # Add prescriptions, past visits, exam orders, and examinations to metadata for inclusion in response
    if medical_prescriptions:
        metadata['medical_prescriptions'] = medical_prescriptions
    if past_medical_visits:
        metadata['past_medical_visits'] = past_medical_visits
    if medical_exam_orders:
        metadata['medical_exam_orders'] = medical_exam_orders
    if medical_examinations:
        metadata['medical_examinations'] = medical_examinations

    contact = None
    if row.get('contact'):
        try:
            contact_data = json.loads(row['contact'])
            if contact_data and isinstance(contact_data, dict):
                # Convert all values to strings as expected by PatientResponse
                contact = {k: str(v) for k, v in contact_data.items() if v is not None}
        except (json.JSONDecodeError, TypeError):
            logger.warning("Invalid contact JSON")

    address = None
    if row.get('address'):
        try:
            address_data = json.loads(row['address'])
            if address_data and isinstance(address_data, dict):
                # Convert all values to strings as expected by PatientResponse
                address = {k: str(v) for k, v in address_data.items() if v is not None}
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Invalid address JSON: {e}")

    emergency_contact = []
    if row.get('emergency_contact'):
        try:
            emergency_contact_data = json.loads(row['emergency_contact'])
            emergency_contact = transform_legacy_emergency_contact(emergency_contact_data)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Invalid emergency contact JSON: {e}")

    # Build PatientResponse object
    full_name = f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Unknown"

    # Convert date_of_birth properly
    dob_date = None
    if row.get('dob'):
        if isinstance(row['dob'], str):
            try:
                dob_date = datetime.strptime(row['dob'], "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"Invalid DOB format: {row['dob']}")
        else:
            dob_date = row['dob']  # Already a date object

    # Convert gender string to Gender enum
    gender_enum = Gender.OTHER  # Default to OTHER if not specified
    if row.get('gender'):
        gender_str = str(row['gender']).upper()  # Database values are uppercase
        if gender_str == "MALE":
            gender_enum = Gender.MALE
        elif gender_str == "FEMALE":
            gender_enum = Gender.FEMALE
        elif gender_str == "UNDISCLOSED":
            gender_enum = Gender.OTHER  # Map UNDISCLOSED to OTHER for display
        else:
            logger.warning(f"Unknown gender value: {gender_str}, defaulting to OTHER")
            gender_enum = Gender.OTHER  # Default fallback

    return PatientResponse(
        id=row['id'],
        user_id=row.get('user_id') or 0,
        country_id=row.get('country_id') or 1,
        first_name=row.get('first_name') or "",
        last_name=row.get('last_name') or "",
        date_of_birth=dob_date,
        gender=gender_enum,
        address=address,
        emergency_contact=emergency_contact,
        whatsapp_number=row.get('phone_number') or row.get('wa_number') or "",
        email=row.get('email') or "",
        signup_step=row.get('signup_step') or 1,
        is_profile_complete=bool(row.get('first_name') and row.get('last_name')),
        is_active=row.get('status') != 'INACTIVE' if row.get('status') else True,
        created_at=row.get('created_at')
    )