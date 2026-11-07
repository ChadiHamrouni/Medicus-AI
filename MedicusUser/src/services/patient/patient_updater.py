"""Patient update and deletion logic."""

import json
from datetime import datetime

from medicus_common.models.patient import PatientResponse, PatientProfileUpdateRequest, PatientStatus
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from .patient_utils import map_gender_to_db


async def update_patient_impl(
    db_manager,
    patient_service,
    patient_id: int,
    update_data: PatientProfileUpdateRequest
) -> PatientResponse:
    """Update patient information.

    Args:
        db_manager: Database manager instance
        patient_service: Patient service instance for get_patient_by_id
        patient_id: ID of patient to update
        update_data: Patient update data

    Returns:
        PatientResponse: Updated patient data

    Raises:
        ValidationError: If patient not found or validation fails
        DatabaseError: If database operation fails
    """

    try:
        # Check if patient exists
        existing = await patient_service.get_patient_by_id(patient_id)
        if not existing:
            raise ValidationError("Patient not found")

        # Build update query dynamically
        update_fields = []
        params = []
        param_count = 1

        if update_data.first_name is not None:
            update_fields.append(f"first_name = ${param_count}")
            params.append(update_data.first_name)
            param_count += 1

        if update_data.last_name is not None:
            update_fields.append(f"last_name = ${param_count}")
            params.append(update_data.last_name)
            param_count += 1

        if update_data.dob is not None:
            update_fields.append(f"dob = ${param_count}")
            params.append(update_data.dob)
            param_count += 1

        if update_data.gender is not None:
            update_fields.append(f"gender = ${param_count}")
            params.append(map_gender_to_db(update_data.gender))
            param_count += 1

        if update_data.contact is not None:
            update_fields.append(f"contact = ${param_count}")
            params.append(json.dumps(update_data.contact))
            param_count += 1

        if update_data.address is not None:
            # Enrich address with country name if country_id is provided
            if isinstance(update_data.address, dict):
                address_data = dict(update_data.address)  # Create a new dict copy
            else:
                address_data = update_data.address

            if isinstance(address_data, dict) and 'country_id' in address_data and address_data['country_id']:
                # Fetch country name from database to denormalize it into address JSON
                country_query = "SELECT name FROM public.countries_view WHERE id = $1"
                country_row = await db_manager.fetchrow(country_query, address_data['country_id'])
                if country_row:
                    address_data['country_name'] = country_row['name']

            update_fields.append(f"address = ${param_count}")
            params.append(json.dumps(address_data))
            param_count += 1

            if isinstance(address_data, dict) and 'country_id' in address_data:
                if address_data['country_id']:
                    update_fields.append(f"country_id = ${param_count}")
                    params.append(address_data['country_id'])
                    param_count += 1

        if update_data.emergency_contact is not None:
            update_fields.append(f"emergency_contact = ${param_count}")
            emergency_contact_list = [ec.dict() for ec in update_data.emergency_contact] if update_data.emergency_contact else []
            params.append(json.dumps(emergency_contact_list))
            param_count += 1

        if update_data.metadata is not None:
            update_fields.append(f"metadata = ${param_count}")
            params.append(json.dumps(update_data.metadata.model_dump()))
            param_count += 1

        if update_data.insurance_coverage is not None:
            update_fields.append(f"insurance_coverage = ${param_count}")
            params.append(json.dumps(update_data.insurance_coverage.model_dump()))
            param_count += 1

        if not update_fields:
            raise ValidationError("No fields to update")

        # Add updated_at timestamp
        update_fields.append(f"updated_at = ${param_count}")
        params.append(datetime.utcnow())
        param_count += 1

        # Add patient_id for WHERE clause
        params.append(patient_id)

        query = f"""
            UPDATE public.patients
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
        """

        await db_manager.execute(query, *params)

        # Return updated patient
        updated_patient = await patient_service.get_patient_by_id(patient_id)

        logger.info(f"Patient updated successfully: {patient_id}")
        return updated_patient

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error updating patient: {e}")
        raise DatabaseError("Failed to update patient")


async def update_patient_user_id_impl(
    db_manager,
    patient_service,
    user_id: int,
    update_data: PatientProfileUpdateRequest
) -> PatientResponse:
    """Update patient information by user ID.

    Args:
        db_manager: Database manager instance
        patient_service: Patient service instance for get_patient_by_user_id
        user_id: ID of patient to update
        update_data: Patient update data

    Returns:
        PatientResponse: Updated patient data

    Raises:
        ValidationError: If patient not found or validation fails
        DatabaseError: If database operation fails
    """

    try:
        # Check if patient exists
        existing = await patient_service.get_patient_by_user_id(user_id)
        if not existing:
            raise ValidationError("Patient not found")

        # Build update query dynamically
        update_fields = []
        params = []
        param_count = 1

        if update_data.first_name is not None:
            update_fields.append(f"first_name = ${param_count}")
            params.append(update_data.first_name)
            param_count += 1

        if update_data.last_name is not None:
            update_fields.append(f"last_name = ${param_count}")
            params.append(update_data.last_name)
            param_count += 1

        if update_data.dob is not None:
            update_fields.append(f"dob = ${param_count}")
            params.append(update_data.dob)
            param_count += 1

        if update_data.gender is not None:
            update_fields.append(f"gender = ${param_count}")
            params.append(map_gender_to_db(update_data.gender))
            param_count += 1

        if update_data.contact is not None:
            update_fields.append(f"contact = ${param_count}")
            params.append(json.dumps(update_data.contact))
            param_count += 1

        if update_data.address is not None:
            update_fields.append(f"address = ${param_count}")
            params.append(json.dumps(update_data.address))
            param_count += 1

            if isinstance(update_data.address, dict) and 'country_id' in update_data.address:
                if update_data.address['country_id']:
                    update_fields.append(f"country_id = ${param_count}")
                    params.append(update_data.address['country_id'])
                    param_count += 1

        if update_data.emergency_contact is not None:
            update_fields.append(f"emergency_contact = ${param_count}")
            emergency_contact_list = [ec.dict() for ec in update_data.emergency_contact] if update_data.emergency_contact else []
            params.append(json.dumps(emergency_contact_list))
            param_count += 1

        if update_data.metadata is not None:
            update_fields.append(f"metadata = ${param_count}")
            params.append(json.dumps(update_data.metadata.model_dump()))
            param_count += 1

        if update_data.insurance_coverage is not None:
            update_fields.append(f"insurance_coverage = ${param_count}")
            params.append(json.dumps(update_data.insurance_coverage.model_dump()))
            param_count += 1

        if not update_fields:
            raise ValidationError("No fields to update")

        # Add updated_at timestamp
        update_fields.append(f"updated_at = ${param_count}")
        params.append(datetime.utcnow())
        param_count += 1

        # Add patient_id for WHERE clause
        params.append(user_id)

        query = f"""
            UPDATE public.patients
            SET {', '.join(update_fields)}
            WHERE user_id = ${param_count}
        """

        await db_manager.execute(query, *params)

        # Return updated patient
        updated_patient = await patient_service.get_patient_by_id(user_id)

        logger.info(f"Patient updated successfully: {user_id}")
        return updated_patient

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error updating patient: {e}")
        raise DatabaseError("Failed to update patient")


async def delete_patient_impl(
    db_manager,
    patient_service,
    patient_id: int
) -> bool:
    """Soft delete a patient by setting status to INACTIVE.

    Args:
        db_manager: Database manager instance
        patient_service: Patient service instance for get_patient_by_id
        patient_id: ID of patient to delete

    Returns:
        bool: True if successful

    Raises:
        ValidationError: If patient not found
        DatabaseError: If database operation fails
    """
    logger.info(f"Deleting patient: {patient_id}")

    try:
        # Check if patient exists
        existing = await patient_service.get_patient_by_id(patient_id)
        if not existing:
            raise ValidationError("Patient not found")

        # Soft delete by updating status
        await db_manager.execute(
            """
            UPDATE public.patients
            SET status = $1, updated_at = $2
            WHERE id = $3
            """,
            PatientStatus.INACTIVE.value,
            datetime.utcnow(),
            patient_id
        )

        logger.info(f"Patient deleted successfully: {patient_id}")
        return True

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error deleting patient: {e}")
        raise DatabaseError("Failed to delete patient")