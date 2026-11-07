"""Patient insurance coverage management."""

import json
from typing import Optional
from datetime import datetime

from medicus_common.models.patient import PatientResponse, InsuranceCoverage
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger


async def add_insurance_coverage_impl(
    db_manager,
    patient_service,
    patient_id: int,
    insurance: InsuranceCoverage
) -> PatientResponse:
    """Add or update insurance coverage for a patient.

    Updates the insurance_coverage JSON field in the patients table.

    Args:
        db_manager: Database manager instance
        patient_service: Patient service instance for get_patient_by_id
        patient_id: ID of the patient to update
        insurance: Insurance coverage details

    Returns:
        Updated PatientResponse with new insurance information

    Raises:
        ValidationError: If patient_id or insurance data is invalid
        DatabaseError: If database operation fails
    """
    if not patient_id or patient_id <= 0:
        raise ValidationError("Valid patient ID is required")

    try:
        # Convert insurance to JSON with date handling
        insurance_dict = insurance.model_dump()
        # Handle date serialization
        for key, value in insurance_dict.items():
            if hasattr(value, 'isoformat'):  # Check if it's a date/datetime object
                insurance_dict[key] = value.isoformat()
        insurance_json = json.dumps(insurance_dict)

        # Update patient record
        query = """
            UPDATE patients
            SET insurance_coverage = $2, updated_at = $3
            WHERE id = $1
            RETURNING id
        """

        result = await db_manager.fetchrow(
            query,
            patient_id,
            insurance_json,
            datetime.now(datetime.UTC)
        )

        if not result:
            raise ValidationError(f"Patient with ID {patient_id} not found")

        # Get updated patient record
        updated_patient = await patient_service.get_patient_by_id(patient_id)

        return updated_patient

    except Exception as e:
        logger.error("Database error adding insurance coverage")
        raise DatabaseError(f"Failed to add insurance coverage: {str(e)}")


async def get_patient_insurance_impl(
    db_manager,
    patient_id: int
) -> Optional[InsuranceCoverage]:
    """Get insurance coverage for a patient.

    Retrieves and parses the insurance_coverage JSON field.

    Args:
        db_manager: Database manager instance
        patient_id: ID of the patient

    Returns:
        InsuranceCoverage if available, None otherwise

    Raises:
        DatabaseError: If database operation fails
    """
    if not patient_id or patient_id <= 0:
        raise ValidationError("Valid patient ID is required")

    try:
        query = "SELECT insurance_coverage FROM patients_view WHERE user_id = $1"

        row = await db_manager.fetchrow(query, patient_id)

        if not row or not row['insurance_coverage']:
            logger.info("No insurance coverage found")
            return None

        # Parse JSON insurance data
        insurance_data = json.loads(row['insurance_coverage'])

        if not insurance_data:
            return None

        insurance = InsuranceCoverage(**insurance_data)

        return insurance

    except json.JSONDecodeError as e:
        logger.error("Invalid JSON in insurance coverage")
        return None
    except Exception as e:
        logger.error("Database error retrieving insurance coverage")
        raise DatabaseError(f"Failed to retrieve insurance coverage: {str(e)}")