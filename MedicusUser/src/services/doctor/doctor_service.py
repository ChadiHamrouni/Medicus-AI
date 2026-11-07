# =============================================================================
# src/services/doctor_profile_service.py
"""Doctor profile management service."""

import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import (
    UserNotFoundError,
    ValidationError,
    DatabaseError
)

from src.services.doctor.helpers import (
    get_doctor_light,
    get_doctor_discovery,
    get_doctor_details,
    validate_working_hours,
    validate_medical_procedures_data,
    validate_medical_procedures,
    validate_contact_info,
    validate_address,
    validate_other_locations,
    validate_other_locations_simple,
    validate_additional_info,
    validate_practice_address,
    validate_other_specialties_ids,
    validate_other_specialties,
    validate_certifications,
    validate_professional_affiliations
)
class DoctorService:
    """Service for managing doctor profile information using existing JSON fields."""

    ALLOWED_BASIC_FIELDS = {
        'first_name', 'last_name', 'prefix', 'certifications'
    }

    ALLOWED_PRACTICE_FIELDS = {
        'prefix', 'first_name', 'last_name',
        'wa_number', 'address', 'language_id'
    }

    # Fields that cannot be updated (protected by database constraints)
    PROTECTED_FIELDS = {
        'medical_licence'  # Cannot be updated due to database trigger
    }

    RESTRICTED_FIELDS = {
        'user_id', 'id', 'created_at', 'updated_at', 'deleted_at'
    }

    @staticmethod
    async def get_doctor_by_id(doctor_id: int) -> Optional[Dict[str, Any]]:
        """
        Get doctor data for public lookups by doctor_id.
        Uses doctors_discovery_view - includes out-of-network doctors.
        """
        return await get_doctor_discovery(doctor_id)

    @staticmethod
    async def get_doctor_public_profile(doctor_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detailed doctor profile by doctor_id for public viewing.
        Used when a patient views a doctor's profile from a conversation.
        Includes working hours, certifications, procedures, etc.
        """
        from .helpers import get_doctor_public_profile as _get_doctor_public_profile
        return await _get_doctor_public_profile(doctor_id)

    @staticmethod
    async def get_connected_doctor(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get doctor data for authenticated user by user_id.
        Uses doctors_view for LIGHT data at login.
        For full profile details, profile endpoint calls get_doctor_details separately.
        """
        return await get_doctor_light(user_id)

    @staticmethod
    async def create_doctor(
            user_id: int,
            first_name: str,
            last_name: str,
            wa_number: Optional[str] = None,
            country_id: int = 1,
            specialty_id: int = 1,
            medical_licence: Optional[str] = None,
            established_since: Optional[datetime] = None,
            gender: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new doctor record for an existing user.

        Args:
            established_since:
            user_id: User ID from auth.users
            first_name: Doctor's first name
            last_name: Doctor's last name
            wa_number: WhatsApp number (auto-generated if not provided)
            country_id: Country ID (defaults to 1)
            specialty_id: Specialty ID (defaults to 1)
            medical_licence: Medical license (auto-generated if not provided)
            gender: Gender (MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY)

        Returns:
            dict with created doctor data

        Raises:
            ValidationError: If doctor already exists or validation fails
            DatabaseError: If database operation fails
        """
        try:
            # Create new doctor record with timestamps
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)

            doctor_query = """
                INSERT INTO public.doctors
                (user_id, first_name, last_name, wa_number, country_id, specialty_id, medical_licence, established_since, gender, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING user_id, id, first_name, last_name, wa_number, country_id, specialty_id, medical_licence, established_since, gender, created_at
            """

            # Convert gender to uppercase and map to database enum (MALE, FEMALE, UNDISCLOSED)
            # Python enum uses "other" and "prefer_not_to_say" but DB uses "UNDISCLOSED"
            if gender:
                gender_upper = gender.upper()
                if gender_upper in ["OTHER", "PREFER_NOT_TO_SAY"]:
                    gender_value = "UNDISCLOSED"
                else:
                    gender_value = gender_upper
            else:
                gender_value = "UNDISCLOSED"  # Default for NOT NULL constraint

            row = await db_manager.fetchrow(
                doctor_query,
                user_id,
                first_name,
                last_name,
                wa_number,
                country_id,
                specialty_id,
                medical_licence,
                established_since,
                gender_value,
                now,
                now,
            )

            if not row:
                raise DatabaseError("Failed to create doctor record - no row returned")

            doctor_data = {
                'id': row['id'],
                'user_id': row['user_id'],
                'first_name': row['first_name'],
                'last_name': row['last_name'],
                'display_name': f"{row['first_name']} {row['last_name']}".strip(),
                'full_name': f"{row['first_name']} {row['last_name']}".strip(),
                'wa_number': row['wa_number'],
                'country_id': row['country_id'],
                'specialty_id': row['specialty_id'],
                'medical_licence': row['medical_licence'],
                'gender': row['gender'],
                'created_at': row['created_at'],
                'established_since': row['established_since'],
            }

            return doctor_data

        except (ValidationError, DatabaseError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to create doctor record: {e}")

    async def update_practice_info(self, user_id: int, practice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update doctor's practice information including address."""
        try:
            # Validate allowed fields
            allowed_updates = {}
            address_data = None

            for field, value in practice_data.items():
                if field in self.PROTECTED_FIELDS:
                    # Skip protected fields silently (database constraint prevents update)
                    continue
                elif field in self.ALLOWED_PRACTICE_FIELDS:
                    if field == 'address':
                        # Handle address separately as it's a JSON field
                        address_data = value
                    else:
                        allowed_updates[field] = value
                elif field in self.RESTRICTED_FIELDS:
                    raise ValidationError(f"Field '{field}' cannot be modified")


            if not allowed_updates and not address_data:
                raise ValidationError("No valid fields to update")

            # Build update query
            set_clauses = []
            values = []
            param_count = 1

            # Handle regular fields
            for field, value in allowed_updates.items():
                set_clauses.append(f"{field} = ${param_count}")
                values.append(value)
                param_count += 1

            # Handle address JSON field
            if address_data:
                validated_address = validate_practice_address(address_data)
                set_clauses.append(f"address = ${param_count}")
                values.append(json.dumps(validated_address))
                param_count += 1


            # Add updated_at timestamp
            set_clauses.append(f"updated_at = ${param_count}")
            values.append(datetime.now(timezone.utc))
            values.append(user_id)

            query = f"""
                UPDATE public.doctors 
                SET {', '.join(set_clauses)}
                WHERE user_id = ${param_count + 1} AND deleted_at IS NULL
                RETURNING id, first_name, last_name, prefix, certifications, specialty_id, 
                         medical_licence, wa_number, address, updated_at
            """

            row = await db_manager.fetchrow(query, *values)
            if not row:
                raise UserNotFoundError(f"Doctor not found for user {user_id}")

            updated_info = dict(row)

            # Parse address JSON if present
            if updated_info.get('address'):
                try:
                    if isinstance(updated_info['address'], str):
                        updated_info['address'] = json.loads(updated_info['address'])
                except (json.JSONDecodeError, TypeError):
                    updated_info['address'] = {}

            # Log all updated fields including address
            updated_fields = list(allowed_updates.keys())
            if address_data:
                updated_fields.append('address')

            return updated_info

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to update practice info: {e}")

    async def update_working_hours(self, user_id: int, working_hours_request) -> Dict[str, Any]:
        """Update doctor's working hours JSON field."""
        try:
            # Pydantic already validated the data, just convert to dict for storage
            full_request_dict = working_hours_request.model_dump()

            query = """
                UPDATE public.doctors 
                SET working_hours = $1, updated_at = $2
                WHERE user_id = $3 AND deleted_at IS NULL
                RETURNING working_hours
            """

            row = await db_manager.fetchrow(
                query,
                json.dumps(full_request_dict),
                datetime.now(timezone.utc),
                user_id
            )

            if not row:
                raise UserNotFoundError(f"Doctor not found for user {user_id}")

            # Parse the returned JSON
            updated_hours = json.loads(row['working_hours']) if isinstance(row['working_hours'], str) else row[
                'working_hours']

            return updated_hours

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to update working hours: {e}")

    async def update_medical_procedures(self, user_id: int, procedures_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update doctor's medical procedures and fees JSON field."""
        try:

            # Validate the entire procedures data structure
            validated_data = validate_medical_procedures_data(procedures_data)

            query = """
                UPDATE public.doctors 
                SET medical_procedures = $1, updated_at = $2
                WHERE user_id = $3 AND deleted_at IS NULL
                RETURNING medical_procedures
            """

            row = await db_manager.fetchrow(
                query,
                json.dumps(validated_data),
                datetime.now(timezone.utc),
                user_id
            )

            if not row:
                raise UserNotFoundError(f"Doctor not found for user {user_id}")

            # Parse the returned JSON
            updated_procedures = json.loads(row['medical_procedures']) if isinstance(row['medical_procedures'],
                                                                                     str) else row['medical_procedures']

            return updated_procedures

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to update medical procedures: {e}")

    async def update_contact_info(self, user_id: int, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update doctor's contact information JSON field."""
        try:

            # Validate contact structure
            validated_contact = validate_contact_info(contact_data)

            query = """
                UPDATE public.doctors 
                SET contact = $1, updated_at = $2
                WHERE user_id = $3 AND deleted_at IS NULL
                RETURNING contact
            """

            row = await db_manager.fetchrow(
                query,
                json.dumps(validated_contact),
                datetime.now(timezone.utc),
                user_id
            )

            if not row:
                raise UserNotFoundError(f"Doctor not found for user {user_id}")

            # Parse the returned JSON
            updated_contact = json.loads(row['contact']) if isinstance(row['contact'], str) else row['contact']

            return updated_contact

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to update contact info: {e}")

    async def update_locations(self, user_id: int, locations_data: List) -> Dict[str, Any]:
        """Update doctor's address and other locations JSON fields."""
        try:

            # Validate other locations (keep them in the original format for other_locations JSON)
            validated_other_locations = validate_other_locations_simple(locations_data)

            # Only update other_locations, don't touch address field
            query = """
                UPDATE public.doctors 
                SET other_locations = $1, updated_at = $2
                WHERE user_id = $3 AND deleted_at IS NULL
                RETURNING address, other_locations
            """
            row = await db_manager.fetchrow(
                query,
                json.dumps(validated_other_locations),
                datetime.now(timezone.utc),
                user_id
            )

            if not row:
                raise UserNotFoundError(f"Doctor not found for user {user_id}")

            # Parse the returned JSON
            result = {}

            # Parse other_locations
            if row['other_locations']:
                result['other_locations'] = json.loads(row['other_locations']) if isinstance(row['other_locations'],
                                                                                             str) else row[
                    'other_locations']
            else:
                result['other_locations'] = []

            return result

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to update locations: {e}")

    async def update_additional_info_structured(self, user_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update doctor's additional information with structured field mapping."""
        try:
            # Prepare fields to update
            update_fields = {}
            update_values = []
            param_count = 1

            # Handle metadata fields (about_you + dob) - use JSONB merge
            metadata_fields = update_data.get('metadata_fields', {})
            if metadata_fields:
                # Filter out None and empty string values
                filtered_metadata = {k: v for k, v in metadata_fields.items() if v is not None and v != ''}
                if filtered_metadata:
                    update_fields['metadata'] = f"COALESCE(metadata::jsonb, '{{}}'::jsonb) || ${param_count}::jsonb"
                    update_values.append(json.dumps(filtered_metadata))
                    param_count += 1

            # Handle contact fields (contact_working_phone + contact_cell_phone) - use JSONB merge
            contact_fields = update_data.get('contact_fields', {})
            if contact_fields:
                # Filter out None and empty string values
                filtered_contact = {k: v for k, v in contact_fields.items() if v is not None and v != ''}
                if filtered_contact:
                    update_fields['contact'] = f"COALESCE(contact::jsonb, '{{}}'::jsonb) || ${param_count}::jsonb"
                    update_values.append(json.dumps(filtered_contact))
                    param_count += 1

            # Handle gender field (direct field)
            gender_value = update_data.get('gender')
            if gender_value is not None and gender_value != '':
                update_fields['gender'] = f"${param_count}"
                update_values.append(gender_value)
                param_count += 1

            # Handle established_since field (direct field)
            established_since_value = update_data.get('established_since')
            if established_since_value is not None:
                update_fields['established_since'] = f"${param_count}"
                update_values.append(established_since_value)
                param_count += 1

            # Add updated_at timestamp
            update_fields['updated_at'] = f"${param_count}"
            update_values.append(datetime.now(timezone.utc))
            param_count += 1

            # Build and execute update query
            if len(update_fields) > 1:  # More than just updated_at
                set_clause = ', '.join([f"{field} = {placeholder}" for field, placeholder in update_fields.items()])
                query = f"""
                    UPDATE public.doctors
                    SET {set_clause}
                    WHERE user_id = ${param_count} AND deleted_at IS NULL
                    RETURNING metadata, contact, gender, established_since
                """
                update_values.append(user_id)

                row = await db_manager.fetchrow(query, *update_values)

                if not row:
                    raise UserNotFoundError(f"Doctor not found for user {user_id}")

                # Parse the returned data
                result = {}

                # Parse metadata
                if row['metadata']:
                    result['metadata'] = json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata']
                else:
                    result['metadata'] = {}

                # Parse contact
                if row['contact']:
                    result['contact'] = json.loads(row['contact']) if isinstance(row['contact'], str) else row['contact']
                else:
                    result['contact'] = {}

                # Add gender
                result['gender'] = row['gender']

                # Add established_since
                result['established_since'] = row['established_since']

                return result
            else:
                raise ValidationError("No valid fields to update")

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to update additional info: {e}")

    async def update_professional_info(self, user_id: int, professional_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update doctor's professional information in metadata and other_specialties fields."""
        try:
            # Prepare fields to update
            update_fields = {}
            update_values = []
            param_count = 1

            # Handle other_specialties field (PostgreSQL integer array)
            if 'other_specialties' in professional_data:
                other_specialties = professional_data['other_specialties']
                if other_specialties is not None:
                    validated_specialties = validate_other_specialties_ids(other_specialties)
                    update_fields['other_specialties'] = f"${param_count}"
                    update_values.append(validated_specialties)
                    param_count += 1
                else:
                    update_fields['other_specialties'] = f"${param_count}"
                    update_values.append(None)
                    param_count += 1

            # Handle certifications field (JSONB)
            if 'certifications' in professional_data:
                certifications = professional_data['certifications']
                if certifications is not None:
                    validated_certifications = validate_certifications(certifications)
                    update_fields['certifications'] = f"${param_count}::jsonb"
                    update_values.append(json.dumps(validated_certifications))
                    param_count += 1
                else:
                    update_fields['certifications'] = f"${param_count}"
                    update_values.append(None)
                    param_count += 1

            # Handle metadata fields - use JSONB merge
            metadata_fields = {
                'practising_since', 'medical_school', 'graduation_year',
                'residency_program', 'residency_year', 'professional_affiliations'
            }

            metadata_updates = {}
            for field in metadata_fields:
                if field in professional_data:
                    value = professional_data[field]
                    if field == 'professional_affiliations' and value is not None:
                        value = validate_professional_affiliations(value)
                    metadata_updates[field] = value

            # Add metadata to update if any metadata fields were provided
            if metadata_updates:
                update_fields['metadata'] = f"COALESCE(metadata::jsonb, '{{}}'::jsonb) || ${param_count}::jsonb"
                update_values.append(json.dumps(metadata_updates))
                param_count += 1

            # Add updated_at timestamp
            update_fields['updated_at'] = f"${param_count}"
            update_values.append(datetime.now(timezone.utc))
            param_count += 1

            # Build and execute update query
            if len(update_fields) > 1:  # More than just updated_at
                set_clause = ', '.join([f"{field} = {placeholder}" for field, placeholder in update_fields.items()])
                query = f"""
                    UPDATE public.doctors
                    SET {set_clause}
                    WHERE user_id = ${param_count} AND deleted_at IS NULL
                    RETURNING metadata, other_specialties, certifications
                """
                update_values.append(user_id)

                row = await db_manager.fetchrow(query, *update_values)

                if not row:
                    raise UserNotFoundError(f"Doctor not found for user {user_id}")

                # Parse the returned data
                result = {}

                # Parse metadata
                if row['metadata']:
                    result['metadata'] = json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata']
                else:
                    result['metadata'] = {}

                # Parse other_specialties (PostgreSQL returns arrays as Python lists)
                if row['other_specialties'] is not None:
                    result['other_specialties'] = row['other_specialties']
                else:
                    result['other_specialties'] = None

                # Parse certifications
                if row['certifications']:
                    result['certifications'] = json.loads(row['certifications']) if isinstance(row['certifications'], str) else row['certifications']
                else:
                    result['certifications'] = None

                return result
            else:
                raise ValidationError("No valid fields to update")

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to update professional info: {e}")

