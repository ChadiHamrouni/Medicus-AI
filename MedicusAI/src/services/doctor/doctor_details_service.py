import json
import os
import time

from medicus_common.core.database import db_manager
from medicus_common.models.doctor.doctor_view import DoctorDetailsView


async def get_doctor_details(doctor_id: int) -> DoctorDetailsView | None:
    """
    Retrieves doctor profile details from doctors_details_view.

    This view contains:
    - Medical license and credentials
    - Practice details: procedures, certifications, working hours
    - Location details: address, other_locations
    - Contact information
    - Additional specialties and languages

    Returns
    -------
    DoctorDetailsView | None
        Object containing profile detail data or None if not found.
    """


    query = """
    SELECT
        id,
        medical_licence,
        medical_procedures,
        certifications,
        languages,
        other_specialties,
        working_hours,
        other_locations,
        contact,
        address
    FROM doctors_details_view
    WHERE id = $1;
    """

    async with db_manager.get_connection() as conn:
        record = await conn.fetchrow(query, doctor_id)

    if not record:
        return None

    details_data = dict(record)

    # Parse JSONB fields
    jsonb_fields = ['medical_procedures', 'certifications', 'working_hours', 'other_locations', 'contact', 'address']
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

    # Unwrap nested structures if needed
    if details_data.get('medical_procedures') and isinstance(details_data['medical_procedures'], dict):
        if 'medical_procedures' in details_data['medical_procedures']:
            details_data['medical_procedures'] = details_data['medical_procedures']['medical_procedures']

    if details_data.get('certifications') and isinstance(details_data['certifications'], dict):
        if 'certifications' in details_data['certifications']:
            details_data['certifications'] = details_data['certifications']['certifications']

    # Transform working_hours if present
    if details_data.get('working_hours'):
        transformed_hours = []
        for wh in details_data['working_hours']:
            if wh.get('is_available') and wh.get('time_slots'):
                for slot in wh['time_slots']:
                    transformed_hours.append({
                        'day_of_week': wh['day_of_week'],
                        'from': slot.get('start_time'),
                        'to': slot.get('end_time'),
                        'is_available': wh.get('is_available', True)
                    })
            elif wh.get('is_available'):
                transformed_hours.append({
                    'day_of_week': wh['day_of_week'],
                    'from': wh.get('from', wh.get('start_time', '09:00')),
                    'to': wh.get('to', wh.get('end_time', '17:00')),
                    'is_available': wh.get('is_available', True)
                })
        details_data['working_hours'] = transformed_hours if transformed_hours else None

    result = DoctorDetailsView(**details_data)


    return result