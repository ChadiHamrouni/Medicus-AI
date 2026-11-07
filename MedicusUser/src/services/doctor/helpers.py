# =============================================================================
# src/services/doctor/helpers.py
"""Doctor profile helper functions and validators."""

import json
from typing import Dict, Any, List, Optional

from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import ValidationError


async def get_doctor_light(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Get minimal doctor data from doctors_view by user_id.
    Used at LOGIN for fast authentication - minimal fields only.

    Args:
        user_id: User ID from auth.users table

    Returns:
        dict with basic doctor profile or None if not found
    """
    try:
        query = """
            SELECT d.*
            FROM public.doctors_view d
            WHERE d.user_id = $1
            LIMIT 1
        """
        row = await db_manager.fetchrow(query, user_id)
        if not row:
            return None

        profile = dict(row)

        # Basic info - ensure required fields are not None
        profile['user_id'] = profile.get('user_id') or 0  # Ensure user_id is not None
        profile['id'] = profile.get('id') or 0  # Ensure id is not None
        profile['prefix'] = profile.get('prefix', '')
        profile['first_name'] = profile.get('first_name', '')
        profile['last_name'] = profile.get('last_name', '')
        profile['display_name'] = f"{profile['first_name']} {profile['last_name']}".strip()
        profile['full_name'] = profile['display_name']
        profile['specialty'] = profile.get('specialty_name', '')
        profile['specialty_id'] = profile.get('specialty_id', 0)
        profile['country_id'] = profile.get('country_id', 0)
        profile['country'] = profile.get('country_name', '')
        profile['language'] = profile.get('language_name', '')
        profile['whatsapp_number'] = profile.get('wa_number', '')

        return profile

    except Exception as e:
        return None


async def get_doctor_discovery(doctor_id: int) -> Optional[Dict[str, Any]]:
    """
    Get medium doctor data from doctors_discovery_view by doctor_id.
    Used for PUBLIC LOOKUPS - includes out-of-network doctors (no user_id).

    Args:
        doctor_id: Doctor ID (doctors.id)

    Returns:
        dict with medium doctor profile or None if not found
    """
    try:
        query = """
            SELECT d.*
            FROM public.doctors_discovery_view d
            WHERE d.id = $1
            LIMIT 1
        """
        row = await db_manager.fetchrow(query, doctor_id)
        if not row:
            return None

        profile = dict(row)

        # Parse contact JSON if present
        if profile.get('contact'):
            try:
                if isinstance(profile['contact'], str):
                    profile['contact'] = json.loads(profile['contact'])
            except (json.JSONDecodeError, TypeError):
                profile['contact'] = {}

        # Parse address JSON if present
        if profile.get('address'):
            try:
                if isinstance(profile['address'], str):
                    profile['address'] = json.loads(profile['address'])
            except (json.JSONDecodeError, TypeError):
                profile['address'] = {}

        # Basic normalization
        profile['display_name'] = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        profile['full_name'] = profile['display_name']

        return profile

    except Exception as e:
        return None


async def get_doctor_public_profile(doctor_id: int) -> Optional[Dict[str, Any]]:
    """
    Get detailed doctor profile by doctor_id for public viewing.
    Used when a patient views a doctor's profile from a conversation.
    Combines discovery view data with details view data.

    Args:
        doctor_id: Doctor ID (doctors.id)

    Returns:
        dict with detailed doctor profile or None if not found
    """
    try:
        # First get the doctor's user_id from doctors table
        user_query = """
            SELECT user_id FROM public.doctors WHERE id = $1 LIMIT 1
        """
        user_row = await db_manager.fetchrow(user_query, doctor_id)
        if not user_row or not user_row.get('user_id'):
            # Doctor exists but no user_id - return discovery data only
            return await get_doctor_discovery(doctor_id)

        user_id = user_row['user_id']

        # Get full details using the existing function
        profile = await get_doctor_details(user_id)
        if profile:
            # Ensure doctor_id is set correctly
            profile['id'] = doctor_id
            return profile

        # Fallback to discovery data if details not available
        return await get_doctor_discovery(doctor_id)

    except Exception as e:
        return None


async def get_doctor_details(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Get complete doctor profile by merging doctors_view + doctors_details_view.

    Returns:
        dict with complete doctor profile (light + details merged) or None if not found
    """
    try:
        # Get LIGHT data first (name, specialty, country, etc.)
        light_data = await get_doctor_light(user_id)
        if not light_data:
            return None

        # Get DETAILS data (working hours, procedures, etc.)
        details_query = """
            SELECT d.*
            FROM public.doctors_details_view d
            WHERE d.user_id = $1
            LIMIT 1
        """
        details_row = await db_manager.fetchrow(details_query, user_id)
        if not details_row:
            # Return light data only if details not found
            return light_data

        # Start with light data, then merge in details
        profile = dict(light_data)
        # Add/override with details fields
        profile.update(dict(details_row))

        # Process doctor details - JSON parsing, field validation, and data transformation
        # JSON fields
        json_fields = [
            'working_hours', 'medical_procedures', 'contact',
            'metadata', 'address', 'other_locations', 'certifications'
        ]
        for field in json_fields:
            if profile.get(field):
                try:
                    if isinstance(profile[field], str):
                        first_parse = json.loads(profile[field])
                        # Handle double-encoded JSON (string inside string)
                        if isinstance(first_parse, str):
                            profile[field] = json.loads(first_parse)
                        else:
                            profile[field] = first_parse
                    # Special handling for medical_procedures - convert list to dict
                    if field == 'medical_procedures' and isinstance(profile[field], list):
                        profile[field] = {}
                except (json.JSONDecodeError, TypeError):
                    # Set default values based on expected field type
                    profile[field] = {} if field in ['contact', 'metadata', 'address', 'medical_procedures'] else []
            else:
                # Set default values for missing fields
                profile[field] = {} if field in ['contact', 'metadata', 'address', 'medical_procedures'] else []

        # Ensure certifications is always a list (extra safety)
        if not isinstance(profile.get('certifications'), list):
            profile['certifications'] = []

        # Ensure lists
        profile['id'] = profile.get('id') or 0  # Ensure id is not None
        profile['working_hours'] = profile.get('working_hours') if isinstance(profile.get('working_hours'),
                                                                              list) else []
        profile['board_certifications'] = profile.get('board_certifications') if isinstance(
            profile.get('board_certifications'), list) else []
        profile['languages_spoken'] = profile.get('languages_spoken') if isinstance(profile.get('languages_spoken'),
                                                                                    list) else []
        # Metadata extras
        metadata = profile.get('metadata', {})
        if isinstance(metadata, dict):
            profile['practising_since'] = metadata.get('practising_since')
            profile['medical_school_metadata'] = metadata.get('medical_school')
            profile['graduation_year_metadata'] = metadata.get('graduation_year')
            profile['residency_program'] = metadata.get('residency_program')
            profile['residency_year'] = metadata.get('residency_year')
            profile['professional_affiliations'] = metadata.get('professional_affiliations', [])
            profile['about_you'] = metadata.get('about_you')
            profile['dob'] = metadata.get('dob')
            profile['additional_links'] = metadata.get('additional_links', [])
        else:
            profile['practising_since'] = None
            profile['medical_school_metadata'] = None
            profile['graduation_year_metadata'] = None
            profile['residency_program'] = None
            profile['residency_year'] = None
            profile['professional_affiliations'] = []
            profile['about_you'] = None
            profile['dob'] = None
            profile['additional_links'] = []

        # Address transform
        raw_address = profile.get('address', {})
        if isinstance(raw_address, dict) and raw_address:
            # Check if required address fields meet validation requirements
            street = (raw_address.get('street') or '').strip()
            city = (raw_address.get('city') or '').strip()
            postal_code = (raw_address.get('postal_code') or '').strip()

            # Only create practice_address if required fields meet minimum validation requirements
            if (len(street) >= 5 and len(city) >= 2 and len(postal_code) >= 3):
                profile['practice_address'] = {
                    'street': street,
                    'city': city,
                    'state': raw_address.get('state'),
                    'postal_code': postal_code,
                    'country': raw_address.get('country', profile.get('country_name', '')),
                    'latitude': raw_address.get('latitude'),
                    'longitude': raw_address.get('longitude')
                }
                if ', ' in street:
                    parts = street.split(', ', 1)
                    profile['address_line_1'] = parts[0]
                    profile['address_line_2'] = parts[1] if len(parts) > 1 else None
                else:
                    profile['address_line_1'] = street
                    profile['address_line_2'] = None
                profile['city'] = city
                profile['state'] = raw_address.get('state')
                profile['zip_code'] = postal_code
            else:
                # Address data doesn't meet validation requirements, set as None
                profile['practice_address'] = None
                profile['address_line_1'] = None
                profile['address_line_2'] = None
                profile['city'] = None
                profile['state'] = None
                profile['zip_code'] = None
        else:
            profile['practice_address'] = None
            profile['address_line_1'] = None
            profile['address_line_2'] = None
            profile['city'] = None
            profile['state'] = None
            profile['zip_code'] = None

        # Contact info
        contact = profile.get('contact', {})
        if isinstance(contact, dict):
            profile['practice_email'] = contact.get('professional_email')
            profile['practice_phone'] = contact.get('professional_phone')
            profile['practice_website'] = contact.get('website_url')
            profile['contact_working_phone'] = contact.get('professional_phone') or contact.get(
                'contact_working_phone')
            profile['contact_cell_phone'] = contact.get('office_phone') or contact.get('contact_cell_phone')
            profile['fax_number'] = contact.get('fax_number')
        else:
            profile['practice_email'] = None
            profile['practice_phone'] = None
            profile['practice_website'] = None
            profile['contact_working_phone'] = None
            profile['contact_cell_phone'] = None
            profile['fax_number'] = None

        return profile

    except Exception as e:
        return None


# =============================================================================
# Validation Functions
# =============================================================================

def validate_working_hours(working_hours: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate working hours structure."""
    if not isinstance(working_hours, list):
        raise ValidationError("Working hours must be a list")

    validated_hours = []
    valid_days = {'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'}

    for day_schedule in working_hours:
        if not isinstance(day_schedule, dict):
            raise ValidationError("Each working day must be an object")

        day = (day_schedule.get('day') or '').lower()
        if day not in valid_days:
            raise ValidationError(f"Invalid day: {day}")

        is_working = day_schedule.get('is_working', False)

        validated_day = {
            'day': day,
            'is_working': bool(is_working)
        }

        if is_working:
            start_time = day_schedule.get('start_time')
            end_time = day_schedule.get('end_time')

            if not start_time or not end_time:
                raise ValidationError(f"Start time and end time required for {day}")

            validated_day['start_time'] = start_time
            validated_day['end_time'] = end_time

            # Optional lunch break
            if 'lunch_break' in day_schedule:
                lunch_break = day_schedule['lunch_break']
                if isinstance(lunch_break, dict) and lunch_break.get('enabled'):
                    validated_day['lunch_break'] = {
                        'enabled': True,
                        'start_time': lunch_break.get('start_time'),
                        'end_time': lunch_break.get('end_time')
                    }

        validated_hours.append(validated_day)

    return validated_hours


def validate_medical_procedures_data(procedures_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the complete medical procedures data structure."""
    if not isinstance(procedures_data, dict):
        raise ValidationError("Medical procedures data must be an object")

    # Extract and validate procedures list
    procedures = procedures_data.get('medical_procedures', [])
    validated_procedures = validate_medical_procedures(procedures)

    # Validate and structure the complete data
    validated_data = {
        'medical_procedures': validated_procedures,
        'currency': procedures_data.get('currency', 'USD'),
        'consultation_types': procedures_data.get('consultation_types', []),
        'insurance_accepted': procedures_data.get('insurance_accepted', [])
    }

    # Validate consultation_types
    if not isinstance(validated_data['consultation_types'], list):
        validated_data['consultation_types'] = []

    # Validate insurance_accepted
    if not isinstance(validated_data['insurance_accepted'], list):
        validated_data['insurance_accepted'] = []

    return validated_data


def validate_medical_procedures(procedures: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate medical procedures structure."""
    if not isinstance(procedures, list):
        raise ValidationError("Medical procedures must be a list")

    validated_procedures = []

    for i, procedure in enumerate(procedures):
        if not isinstance(procedure, dict):
            raise ValidationError("Each procedure must be an object")

        name = (procedure.get('procedure_name') or '').strip()

        if not name:
            raise ValidationError("Procedure name is required")

        price_raw = procedure.get('price', 0)

        try:
            if price_raw:
                price_value = float(price_raw)
            else:
                price_value = 0
        except (ValueError, TypeError) as e:
            price_value = 0

        validated_procedure = {
            'procedure_name': name,
            'procedure_price': price_value,
        }

        validated_procedures.append(validated_procedure)

    return validated_procedures


def validate_contact_info(contact_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate contact information structure."""
    if not isinstance(contact_data, dict):
        raise ValidationError("Contact data must be an object")

    validated_contact = {}

    # Optional contact fields - updated to match ContactInfo model
    optional_fields = [
        'professional_email', 'professional_phone', 'office_phone',
        'fax_number', 'website_url', 'whatsapp_number', 'email',
        'phone_number', 'emergency_contact', 'phone', 'mobile', 'website', 'fax'
    ]

    for field in optional_fields:
        if field in contact_data and contact_data[field]:
            validated_contact[field] = str(contact_data[field]).strip()

    return validated_contact


def validate_address(address_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate address structure."""
    if not isinstance(address_data, dict):
        raise ValidationError("Address data must be an object")

    validated_address = {}

    # Address fields
    address_fields = ['street', 'city', 'state', 'postal_code', 'country', 'building', 'floor', 'suite']

    for field in address_fields:
        if field in address_data and address_data[field]:
            validated_address[field] = str(address_data[field]).strip()

    return validated_address


def validate_other_locations(other_locations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate other locations structure."""
    if not isinstance(other_locations, list):
        raise ValidationError("Other locations must be a list")

    validated_locations = []

    for location in other_locations:
        if not isinstance(location, dict):
            raise ValidationError("Each location must be an object")

        validated_location = {
            'name': (location.get('name') or '').strip(),
            'address': validate_address(location.get('address', {})),
            'phone_number': location.get('phone_number', ''),
            'is_primary': location.get('is_primary', False),
            'working_hours': location.get('working_hours', [])
        }

        validated_locations.append(validated_location)

    return validated_locations


def validate_other_locations_simple(other_locations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate other locations structure for simple location data."""
    if not isinstance(other_locations, list):
        raise ValidationError("Other locations must be a list")

    validated_locations = []

    for location in other_locations:
        if not isinstance(location, dict):
            raise ValidationError("Each location must be an object")

        # Ensure ID is present and valid
        location_id = location.get('id')
        if location_id is None:
            raise ValidationError("Location ID is required")
        if not isinstance(location_id, int) or location_id <= 0:
            raise ValidationError(f"Location ID must be a positive integer, got: {location_id}")

        validated_location = {
            'id': location_id,
            'location_name': (location.get('location_name') or '').strip(),
            'address_line_1': (location.get('address_line_1') or '').strip(),
            'address_line_2': (location.get('address_line_2') or '').strip(),
            'city': (location.get('city') or '').strip(),
            'state': (location.get('state') or '').strip(),
            'zip_code': (location.get('zip_code') or '').strip(),
            'is_primary': location.get('is_primary', False)
        }

        validated_locations.append(validated_location)

    return validated_locations


def validate_additional_info(additional_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate additional information structure."""
    if not isinstance(additional_data, dict):
        raise ValidationError("Additional data must be an object")

    validated_additional = {}

    # Allowed additional fields
    allowed_fields = {
        'full_name': str,
        'email': str,
        'specialty': str,
        'sub_specialty': str,
        'years_experience': int,
        'practice_name': str,
        'practice_phone': str,
        'practice_email': str,
        'practice_website': str,
        'accepts_new_patients': bool,
        'telehealth_available': bool,
        'about': str,
        'bio': str,
        'education': list,
        'experience': list,
        'awards': list,
        'publications': list,
        'social_links': dict,
        'professional_links': dict,
        'languages_spoken': list,
        'insurance_accepted': list,
        'profile_image_url': str
    }

    for field, expected_type in allowed_fields.items():
        if field in additional_data:
            value = additional_data[field]

            # Include all fields, even if they are None or empty
            if expected_type == str:
                result = str(value).strip() if value is not None else value
                validated_additional[field] = result
            elif expected_type == int:
                result = int(value) if value is not None and isinstance(value, (int, float, str)) else value
                validated_additional[field] = result
            elif expected_type == bool:
                result = bool(value) if value is not None else value
                validated_additional[field] = result
            elif expected_type == list:
                if value is None or isinstance(value, list):
                    validated_additional[field] = value
                else:
                    raise ValidationError(f"Field '{field}' must be a list")
            elif expected_type == dict:
                if value is None or isinstance(value, dict):
                    validated_additional[field] = value
                else:
                    raise ValidationError(f"Field '{field}' must be an object")

    return validated_additional


def validate_practice_address(address_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and transform practice address from PracticeInfoAddress to Address model format."""
    if not isinstance(address_data, dict):
        raise ValidationError("Address data must be an object")

    # Required fields in PracticeInfoAddress format
    required_fields = ['address_line_1', 'city', 'state', 'zip_code']
    for field in required_fields:
        if not address_data.get(field) or not address_data[field].strip():
            raise ValidationError(f"Address field '{field}' is required")

    # Validate minimum lengths
    if len(address_data['address_line_1'].strip()) < 5:
        raise ValidationError("Address line 1 must be at least 5 characters")
    if len(address_data['city'].strip()) < 2:
        raise ValidationError("City must be at least 2 characters")
    if len(address_data['state'].strip()) < 2:
        raise ValidationError("State must be at least 2 characters")
    if len(address_data['zip_code'].strip()) < 2:
        raise ValidationError("ZIP code must be at least 2 characters")

    # Transform to Address model format for database storage
    street = address_data['address_line_1'].strip()
    if address_data.get('address_line_2'):
        street += f", {address_data['address_line_2'].strip()}"

    validated_address = {
        'address_line_1': address_data['address_line_1'].strip(),
        'address_line_2': (address_data.get('address_line_2') or '').strip() or None,
        'city': address_data['city'].strip(),
        'state': address_data['state'].strip(),
        'zip_code': address_data['zip_code'].strip(),
        'latitude': None,
        'longitude': None
    }

    return validated_address


def validate_other_specialties_ids(other_specialties: List[int]) -> List[int]:
    """Validate other specialties ID list for PostgreSQL integer array."""
    if not isinstance(other_specialties, list):
        raise ValidationError("Other specialties must be a list")

    validated_specialties = []
    for specialty_id in other_specialties:
        if isinstance(specialty_id, int) and specialty_id > 0:
            validated_specialties.append(specialty_id)
        elif isinstance(specialty_id, str) and specialty_id.isdigit():
            validated_specialties.append(int(specialty_id))
        else:
            raise ValidationError(f"Invalid specialty ID: {specialty_id}. Must be a positive integer.")

    return validated_specialties


def validate_other_specialties(other_specialties: List[str]) -> List[str]:
    """Validate other specialties list (legacy method for string specialties)."""
    if not isinstance(other_specialties, list):
        raise ValidationError("Other specialties must be a list")

    validated_specialties = []
    for specialty in other_specialties:
        if isinstance(specialty, str) and specialty.strip():
            validated_specialties.append(specialty.strip())

    return validated_specialties


def validate_certifications(certifications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validate medical certifications list."""
    if not isinstance(certifications, list):
        raise ValidationError("Certifications must be a list")

    validated_certifications = []
    for i, cert in enumerate(certifications):
        if not isinstance(cert, dict):
            raise ValidationError("Each certification must be an object")

        title = (cert.get('title') or '').strip()
        certif_date = (cert.get('certif_date') or '').strip()

        if not title:
            raise ValidationError("Certification title is required")
        if not certif_date:
            raise ValidationError("Certification date is required")

        validated_cert = {
            'title': title,
            'certif_date': certif_date,
            'issuing_body': (cert.get('issuing_body') or '').strip() if cert.get('issuing_body') else None
        }

        validated_certifications.append(validated_cert)

    return validated_certifications


def validate_professional_affiliations(affiliations: List[str]) -> List[str]:
    """Validate professional affiliations list."""
    if not isinstance(affiliations, list):
        raise ValidationError("Professional affiliations must be a list")

    validated_affiliations = []
    for affiliation in affiliations:
        if isinstance(affiliation, str) and affiliation.strip():
            validated_affiliations.append(affiliation.strip())

    return validated_affiliations
