"""Medication service for MedicusUser.

Provides medication operations using medications_view materialized view.

Note: Prescriptions are created by doctors in MedicusAI using medications.py
This service provides read-only access for patients to view their medications.
"""

from typing import Optional, List, Dict, Any

from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager


class MedicationService:
    """Service class for patient medication operations."""

    def __init__(self):
        """Initialize the medication service."""
        self.db_manager = db_manager

    async def get_patient_medications(
        self,
        patient_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get all medications for a patient from medications_view.

        Queries the medications_view materialized view which computes status automatically.

        Args:
            patient_id: ID of the patient
            limit: Maximum number of results (default 100)
            offset: Number of results to skip (default 0)

        Returns:
            List[Dict[str, Any]]: List of medication records with computed status

        Raises:
            ValidationError: If patient_id is invalid
            DatabaseError: If database operation fails
        """
        logger.info(f"[MED_SERVICE] get_current_medications called for patient {patient_id}")

        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")

        if limit <= 0 or limit > 500:
            raise ValidationError("Limit must be between 1 and 500")
        if offset < 0:
            raise ValidationError("Offset must be non-negative")

        try:
            # Query medications_view - status is computed by the view
            query = """
                SELECT
                    id,
                    patient_id,
                    doctor_id,
                    doctor_name,
                    date_prescribed,
                    medication_name,
                    dose,
                    frequency,
                    duration_days,
                    form,
                    purpose,
                    notes,
                    start_date,
                    end_date,
                    status
                FROM public.medications_view
                WHERE patient_id = $1
                ORDER BY
                    start_date DESC NULLS LAST,
                    id DESC
                LIMIT $2 OFFSET $3
            """

            logger.info(f"[MED_SERVICE] Querying medications_view for patient {patient_id}, limit={limit}, offset={offset}")

            rows = await self.db_manager.fetch(query, patient_id, limit, offset)

            logger.info(f"[MED_SERVICE] Query returned {len(rows)} medications from database")

            # Convert database rows to MedicationEntry dicts
            # IMPORTANT: Only include fields defined in MedicationEntry model
            medications = []
            for row in rows:
                # Map view status to model status: 'active' → 'current', 'past' → 'previous'
                status = 'current' if row['status'] == 'active' else 'previous'

                # Calculate days_taken and days_left
                days_taken = None
                days_left = None
                if row['start_date']:
                    from datetime import date as dt_date
                    today = dt_date.today()
                    days_taken = (today - row['start_date']).days
                    if days_taken < 0:
                        days_taken = 0

                    if row['duration_days'] is not None:
                        days_left = row['duration_days'] - days_taken
                        if days_left < 0:
                            days_left = 0
                    elif row['end_date'] and today < row['end_date']:
                        days_left = (row['end_date'] - today).days

                # Build medication dict matching MedicationEntry model exactly
                medication = {
                    "id": row['id'],
                    "medication_name": row['medication_name'],
                    "strength": None,  # Not in view
                    "form": row['form'],
                    "dose": row['dose'],
                    "frequency": row['frequency'],
                    "time_of_day": None,  # Not in view
                    "start_date": row['start_date'],
                    "end_date": row['end_date'],
                    "status": status,
                    "duration_days": row['duration_days'],
                    "days_taken": days_taken,
                    "days_left": days_left,
                    "purpose": row['purpose'],
                    "instructions": row['notes'],
                    "prescribed_by": row['doctor_name'],
                    "prescribed_at": row['date_prescribed'],
                    "source": None  # Not in view
                }
                medications.append(medication)

            logger.info(
                f"[MED_SERVICE] Processed {len(medications)} medications - "
                f"Sample keys: {list(medications[0].keys()) if medications else 'NONE'}"
            )

            if medications:
                logger.info(
                    f"[MED_SERVICE] Sample medication: medication_name={medications[0]['medication_name']}, "
                    f"status={medications[0]['status']}, dose={medications[0]['dose']}"
                )

            return medications

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"[MED_SERVICE] Database error retrieving medications: {str(e)}", exc_info=True)
            raise DatabaseError(f"Failed to retrieve medications: {str(e)}")

    def _format_duration(self, duration_days: Optional[int]) -> str:
        """Format duration days into readable string.

        Args:
            duration_days: Number of days for medication duration

        Returns:
            str: Formatted duration string (e.g., "7 days", "2 weeks", "3 months")
        """
        if not duration_days or duration_days <= 0:
            return "N/A"

        # Convert to weeks if evenly divisible by 7
        if duration_days % 7 == 0:
            weeks = duration_days // 7
            if weeks == 1:
                return "1 week"
            elif weeks < 4:
                return f"{weeks} weeks"

        # Convert to months if approximately divisible by 30
        if duration_days >= 30:
            months = duration_days // 30
            if months == 1:
                return "1 month"
            elif months < 12:
                return f"{months} months"

        # Convert to years
        if duration_days >= 365:
            years = duration_days // 365
            if years == 1:
                return "1 year"
            else:
                return f"{years} years"

        # Return in days
        if duration_days == 1:
            return "1 day"
        else:
            return f"{duration_days} days"


# Singleton instance
medication_service = MedicationService()