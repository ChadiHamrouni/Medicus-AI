# =============================================================================
# src/services/dependent_service.py
"""Service for managing dependent patients."""

import json
from datetime import datetime, timezone, date
from typing import Optional, Dict, Any, List

from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import (
    UserNotFoundError,
    ValidationError,
    DatabaseError,
)
from medicus_common.models.patient.patient_dependents import (
    CreateDependentPatientRequest,
    UpdateDependentPatientRequest,
    DependentPatientResponse,
    DependentPatientListResponse,
)
from .patient_utils import map_gender_to_db, map_db_to_gender


class DependentService:
    """Service for managing dependent patients using the simplified patients table approach."""

    # --- NEW HELPER METHODS ---
    @staticmethod
    def _safe_json_load(data: Optional[str]) -> Optional[Dict[str, Any]]:
        """Safely loads JSON data from a string, handling None and errors."""
        if not data:
            return {}
        try:
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            logger.warning("Invalid JSON data encountered during parsing", raw_data=data)
            return {}

    @staticmethod
    def _process_patient_row(row: dict) -> DependentPatientResponse:
        """Centralized logic for parsing JSON, calculating age, and preparing the response model."""
        row_dict = dict(row)

        # 1. Handle JSON fields - parse if present from DB, otherwise set defaults
        # Emergency contact
        if "emergency_contact" in row_dict and row_dict["emergency_contact"]:
            ec_raw = row_dict["emergency_contact"]
            if isinstance(ec_raw, str):
                ec_data = DependentService._safe_json_load(ec_raw)
            else:
                ec_data = ec_raw
            row_dict["emergency_contact"] = _transform_legacy_emergency_contact(ec_data)
        else:
            row_dict["emergency_contact"] = []

        # Other JSON fields
        for field in ["contact", "address", "metadata", "medical_prescriptions", "past_medical_visits", "medical_data"]:
            if field in row_dict and row_dict[field]:
                if isinstance(row_dict[field], str):
                    row_dict[field] = DependentService._safe_json_load(row_dict[field])
            else:
                if field in ["medical_prescriptions", "past_medical_visits"]:
                    row_dict[field] = []
                elif field == "metadata":
                    row_dict[field] = {}
                else:
                    row_dict[field] = None

        # 2. Convert gender from DB format to Gender enum
        if "gender" in row_dict and row_dict["gender"]:
            row_dict["gender"] = map_db_to_gender(row_dict["gender"])

        # 3. Compute dynamic fields (full_name and age)
        row_dict["full_name"] = f"{row_dict.get('first_name', '')} {row_dict.get('last_name', '')}".strip()

        # Use current_age from view if available, otherwise calculate from dob
        if "current_age" in row_dict and row_dict["current_age"] is not None:
            row_dict["age"] = int(row_dict["current_age"])
        else:
            dob = row_dict.get('dob')
            if dob:
                today = date.today()
                # Ensure DOB is a date object
                if isinstance(dob, datetime):
                    dob = dob.date()
                row_dict["age"] = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            else:
                row_dict["age"] = 0
                row_dict["dob"] = date(1900, 1, 1)

        return DependentPatientResponse(**row_dict)

    # --- CORE CRUD METHODS (CLEANED UP) ---

    @staticmethod
    async def get_dependent_patients(
            user_id: int, include_main: bool = True
    ) -> DependentPatientListResponse:
        """Get all patient records (main and dependent) for a user."""
        try:
            # 1. Verification (Same)
            user_exists = await db_manager.fetchrow(
                "SELECT id FROM auth.users_view WHERE id = $1 AND deleted_at IS NULL", user_id,
            )
            if not user_exists:
                raise UserNotFoundError(f"User {user_id} not found")

            # 2. Database Fetch - Only fields from materialized view
            query = """
                SELECT id, user_id, first_name, last_name, dob, gender, relationship,
                       wa_number, status, country_name, language_name, current_age, created_at, updated_at
                FROM public.patients_view
                WHERE user_id = $1 AND status = 'ACTIVE'
                ORDER BY
                    CASE relationship WHEN 'main' THEN 1 ELSE 2 END, created_at ASC
            """
            rows = await db_manager.fetch(query, user_id)

            main_patient = None
            dependents = []

            # 3. Process Responses (Refactored)
            for row in rows:
                patient_response = DependentService._process_patient_row(dict(row))

                if patient_response.relationship.value == "main":
                    main_patient = patient_response
                else:
                    dependents.append(patient_response)

            # 4. Prepare response (Same)
            response_data = {
                "dependents": dependents,
                "total": len(dependents),
                "main_patient": main_patient if include_main else None,
                "summary": {}
            }
            return DependentPatientListResponse(**response_data)

        except UserNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to get dependent patients for user {user_id}: {str(e)}")
            raise DatabaseError(f"Failed to get dependent patients: {e}")

    @staticmethod
    async def get_dependent_patient(
            user_id: int, patient_id: int
    ) -> DependentPatientResponse:
        """Get a specific patient (main or dependent) by ID for a user."""
        try:
            # 1. Database Fetch - Only fields from materialized view
            query = """
                SELECT id, user_id, first_name, last_name, dob, gender, relationship,
                       wa_number, status, country_name, language_name, current_age, created_at, updated_at
                FROM public.patients_view
                WHERE id = $1 AND user_id = $2
            """
            row = await db_manager.fetchrow(query, patient_id, user_id)

            if not row:
                raise UserNotFoundError(
                    f"Dependent patient {patient_id} not found for user {user_id}"
                )

            # 2. Process Response (Refactored)
            return DependentService._process_patient_row(dict(row))

        except UserNotFoundError:
            raise
        except Exception as e:
            logger.error(
                f"Failed to get dependent patient {patient_id} for user {user_id}: {str(e)}"
            )
            raise DatabaseError(f"Failed to get dependent patient: {e}")

    @staticmethod
    async def create_dependent_patient(
            user_id: int, request: CreateDependentPatientRequest
    ) -> DependentPatientResponse:
        """Create a new dependent patient for the user."""
        try:
            # 1. Verification and Pre-checks (Same)
            user_exists = await db_manager.fetchrow(
                "SELECT id FROM auth.users_view WHERE id = $1 AND deleted_at IS NULL", user_id,
            )
            if not user_exists:
                raise UserNotFoundError(f"User {user_id} not found")

            main_patient = await db_manager.fetchrow(
                "SELECT id FROM public.patients_view WHERE user_id = $1 AND relationship = 'main'", user_id,
            )
            if not main_patient:
                raise ValidationError("Main patient record must exist before adding dependents")

            # 2. Data Preparation (Same)
            wa_number = request.wa_number
            if not wa_number:
                max_patient_id = await db_manager.fetchval(
                    "SELECT COALESCE(MAX(id), 0) FROM public.patients_view"
                )
                wa_number = f"+1{user_id:05d}{(max_patient_id + 1):05d}"

            emergency_contact_json = [ec.dict() for ec in
                                      request.emergency_contact] if request.emergency_contact else []
            metadata = request.metadata or {}
            metadata.update({
                "created_by": "dependent_service",
                "dependent_type": request.relationship.value,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            # 3. Database Insert (Same)
            insert_query = """
                INSERT INTO public.patients 
                (user_id, first_name, last_name, dob, gender, relationship, wa_number, 
                 emergency_contact, metadata, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
                RETURNING *
            """
            patient_row = await db_manager.fetchrow(
                insert_query,
                user_id, request.first_name, request.last_name, request.dob, map_gender_to_db(request.gender),
                request.relationship.value, wa_number,
                json.dumps(emergency_contact_json), json.dumps(metadata),
            )
            if not patient_row:
                raise DatabaseError("Failed to create dependent patient")

            # 4. Process Response (Refactored)
            dependent_response = DependentService._process_patient_row(dict(patient_row))

            return dependent_response

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Failed to create dependent patient for user {user_id}: {str(e)}")
            raise DatabaseError(f"Failed to create dependent patient: {e}")

    @staticmethod
    async def update_dependent_patient(
            user_id: int, patient_id: int, request: UpdateDependentPatientRequest
    ) -> DependentPatientResponse:
        """Update a dependent patient."""
        try:
            # 1. Verification (Same)
            existing = await db_manager.fetchrow(
                "SELECT id, relationship FROM public.patients_view WHERE id = $1 AND user_id = $2",
                patient_id, user_id,
            )
            if not existing:
                raise UserNotFoundError(f"Dependent patient {patient_id} not found for user {user_id}")
            if existing["relationship"] == "main":
                raise ValidationError("Cannot update main patient through dependent endpoints")

            # 2. Dynamic Query Building (Simplified for brevity, but retains dynamic nature)
            set_clauses = []
            values = []
            param_count = 1

            # "DELETED" (what the app sends to remove a dependent) is a soft delete:
            # deleted_at hides the row everywhere; status must stay within the CHECK set.
            status = request.status.upper() if isinstance(request.status, str) else request.status
            if status == "DELETED":
                set_clauses.append("deleted_at = now()")
                status = "INACTIVE"

            # Use a dictionary of update fields for cleaner iteration
            update_fields = {
                'first_name': request.first_name,
                'last_name': request.last_name,
                'dob': request.dob,
                'gender': map_gender_to_db(request.gender) if request.gender else None,
                'relationship': request.relationship.value if request.relationship else None,
                'wa_number': request.wa_number,
                'metadata': json.dumps(request.metadata) if request.metadata is not None else None,
                'status': status
            }

            for field, value in update_fields.items():
                if value is not None:
                    set_clauses.append(f"{field} = ${param_count}")
                    values.append(value)
                    param_count += 1

            # Special handling for complex JSON objects
            if request.emergency_contact is not None:
                set_clauses.append(f"emergency_contact = ${param_count}")
                emergency_contact_list = [ec.dict() for ec in
                                          request.emergency_contact] if request.emergency_contact else []
                values.append(json.dumps(emergency_contact_list))
                param_count += 1

            if request.address is not None:
                set_clauses.append(f"address = ${param_count}")
                values.append(json.dumps(request.address.dict()))
                param_count += 1

            if not set_clauses:
                raise ValidationError("No fields to update")

            update_query = f"""
                UPDATE public.patients 
                SET {', '.join(set_clauses)}
                WHERE id = ${param_count} AND user_id = ${param_count + 1}
                RETURNING *
            """
            values.extend([patient_id, user_id])

            updated_row = await db_manager.fetchrow(update_query, *values)

            if not updated_row:
                raise DatabaseError("Failed to update dependent patient")

            # 4. Process Response (Refactored)
            response = DependentService._process_patient_row(dict(updated_row))

            return response

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(
                f"Failed to update dependent patient {patient_id} for user {user_id}: {str(e)}"
            )
            raise DatabaseError(f"Failed to update dependent patient: {e}")

    @staticmethod
    async def delete_dependent_patient(user_id: int, patient_id: int) -> bool:
        """Delete a dependent patient."""
        try:
            # 1. Verification (Same)
            existing = await db_manager.fetchrow(
                "SELECT id, relationship FROM public.patients_view WHERE id = $1 AND user_id = $2",
                patient_id, user_id,
            )
            if not existing:
                raise UserNotFoundError(f"Dependent patient {patient_id} not found for user {user_id}")
            if existing["relationship"] == "main":
                raise ValidationError("Cannot delete main patient through dependent endpoints")

            # 2. Database Delete (Same)
            delete_result = await db_manager.execute(
                "DELETE FROM public.patients WHERE id = $1 AND user_id = $2",
                patient_id, user_id,
            )
            success = delete_result == "DELETE 1"

            if success:
                logger.info(f"Deleted dependent patient {patient_id} for user {user_id}")
            else:
                logger.warning(f"Failed to delete dependent patient {patient_id} for user {user_id}")

            return success

        except (UserNotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(
                f"Failed to delete dependent patient {patient_id} for user {user_id}: {str(e)}"
            )
            raise DatabaseError(f"Failed to delete dependent patient: {e}")


def _transform_legacy_emergency_contact(ec_data) -> List[dict]:
    """Transform legacy emergency contact format to new list format."""
    # This logic remains the same as it is a complex, isolated transformation
    if isinstance(ec_data, list):
        result = []
        for contact in ec_data:
            if isinstance(contact, dict):
                if "phone_number" in contact and "phone" not in contact:
                    contact = {**contact, "phone": contact.pop("phone_number")}
                result.append(contact)
        return result

    if isinstance(ec_data, dict):
        if "name" in ec_data and ("phone" in ec_data or "phone_number" in ec_data) and "relationship" in ec_data:
            if "phone_number" in ec_data and "phone" not in ec_data:
                ec_data = {**ec_data, "phone": ec_data.pop("phone_number")}
            return [ec_data]

        # ... (complex primary/secondary contact parsing logic omitted for brevity, but it should remain here)
        contacts = []

        if "primary_contact" in ec_data and ec_data["primary_contact"]:
            primary = ec_data["primary_contact"]
            if isinstance(primary, dict) and primary.get("name") and (
                    primary.get("phone") or primary.get("phone_number")):
                contact = {
                    "name": primary.get("name", ""),
                    "phone": primary.get("phone", primary.get("phone_number", "")),
                    "relationship": primary.get("relationship", "Emergency Contact"),
                    "email": primary.get("email"),
                    "is_primary": True,
                    "address": primary.get("address"),
                    "notes": primary.get("notes")
                }
                contact = {k: v for k, v in contact.items() if v is not None}
                contacts.append(contact)

        if "secondary_contact" in ec_data and ec_data["secondary_contact"]:
            secondary = ec_data["secondary_contact"]
            if isinstance(secondary, dict) and secondary.get("name") and (
                    secondary.get("phone") or secondary.get("phone_number")):
                contact = {
                    "name": secondary.get("name", ""),
                    "phone": secondary.get("phone", secondary.get("phone_number", "")),
                    "relationship": secondary.get("relationship", "Emergency Contact"),
                    "email": secondary.get("email"),
                    "is_primary": False,
                    "address": secondary.get("address"),
                    "notes": secondary.get("notes")
                }
                contact = {k: v for k, v in contact.items() if v is not None}
                contacts.append(contact)

        return contacts if contacts else []

    return []

# Singleton instance
dependent_service = DependentService()