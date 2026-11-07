import json

from medicus_common.core.database import db_manager
from medicus_common.models.patient.patient_view import PatientDetailsView


async def get_patient_details(patient_id: int) -> PatientDetailsView | None:
    """
    Retrieves patient profile details from patients_view.

    This view contains:
    - Basic patient info (name, dob, gender, age)
    - Contact information (contact, address, emergency_contact)
    - Insurance coverage
    - Country and language preferences
    - Metadata

    Returns
    -------
    PatientDetailsView | None
        Object containing profile detail data or None if not found.
    """

    query = """
    SELECT
        id,
        user_id,
        first_name,
        last_name,
        dob,
        gender,
        relationship,
        wa_number,
        status,
        country_name,
        language_name,
        current_age,
        contact,
        address,
        emergency_contact,
        insurance_coverage,
        metadata,
        created_at,
        updated_at
    FROM patients_view
    WHERE id = $1;
    """

    async with db_manager.get_connection() as conn:
        record = await conn.fetchrow(query, patient_id)

    if not record:
        return None

    details_data = dict(record)

    # Parse JSONB fields
    jsonb_fields = ['contact', 'address', 'emergency_contact', 'insurance_coverage', 'metadata']
    for field in jsonb_fields:
        value = details_data.get(field)
        if value is not None and value != '':
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    # Handle double-encoded JSON
                    if isinstance(parsed, str):
                        parsed = json.loads(parsed)
                    details_data[field] = None if (parsed == {} or parsed == []) else parsed
                except (json.JSONDecodeError, TypeError):
                    details_data[field] = None
            elif value == {} or value == []:
                details_data[field] = None
        else:
            details_data[field] = None

    result = PatientDetailsView(**details_data)

    return result
