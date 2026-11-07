"""Medical vitals service for MedicusUser.

ARCHITECTURE (Materialized Views):
- medical_vitals_latest_view: Latest vitals per patient+vital_id
  Columns: id, patient_id, doctor_name, healthcare_provider_name, recorded_at,
           vital_id, vital_category, display_name, vital_value,
           convo_id, message_id, tool, actor_role, actor_user_id

- medical_vitals_view: Full vitals history (same columns + vital_text, unit)

Views already JOIN with doctors, healthcare_providers, vital_reference_ranges.
This service provides read-only access for patients to view their vitals.
"""

from typing import Dict, Any

from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager


class MedicalVitalsService:
    """
    Service class for patient medical vitals operations.
    Retrieves and formats medical vitals data from medical_vitals_view.

    ARCHITECTURE NOTES:
    - Queries new views with simplified schema
    - No SQL-side threshold/trend computation
    - Returns raw vitals data for UI rendering
    - AI tools use vitals_helpers for enrichment
    """

    def __init__(self):
        """Initialize the medical vitals service."""
        self.db_manager = db_manager

    # --- PUBLIC API ---

    async def get_latest_medical_vitals(
        self,
        patient_id: int
    ) -> Dict[str, Any]:
        """Get latest medical vitals for a patient grouped by category.

        Retrieves latest values from medical_vitals_latest_view and groups them
        into categories: vitals, lifestyle, body_metrics, vaccines, biological, reproductive.

        VIEW SCHEMA (medical_vitals_latest_view):
        - id, patient_id, doctor_name, healthcare_provider_name, recorded_at
        - vital_id, vital_category, display_name, vital_value
        - convo_id, message_id, tool, actor_role, actor_user_id

        Args:
            patient_id: ID of the patient

        Returns:
            Dict[str, Any]: Latest medical vitals data grouped by category

        Raises:
            ValidationError: If patient_id is invalid
            DatabaseError: If database operation fails
        """
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")

        try:
            # Query view - all needed columns are already in the view
            query = """
                SELECT
                    id,
                    patient_id,
                    doctor_name,
                    healthcare_provider_name,
                    recorded_at,
                    vital_id,
                    COALESCE(vital_category, 'other') AS vital_category,
                    display_name,
                    vital_value,
                    convo_id,
                    message_id,
                    tool,
                    actor_role,
                    actor_user_id,
                    unit
                FROM public.medical_vitals_latest_view
                WHERE patient_id = $1
                ORDER BY vital_category, display_name
            """

            rows = await self.db_manager.fetch(query, patient_id)

            if not rows:
                return self._empty_response(patient_id)

            # Group vitals by category
            grouped = {
                "vitals": [],
                "lifestyle": [],
                "body_metrics": [],
                "vaccines": [],
                "immunization": [],
                "biological": [],
                "reproductive": [],
                "other": []
            }

            for row in rows:
                category = row['vital_category'] or 'other'

                # Handle None vital_value - use empty string or skip entry
                vital_value = row['vital_value']
                if vital_value is None:
                    vital_value = ''

                vital_entry = {
                    'id': row['id'],
                    'patient_id': patient_id,
                    'doctor_name': row['doctor_name'],
                    'healthcare_provider_name': row['healthcare_provider_name'],
                    'recorded_at': row['recorded_at'],
                    'vital_id': row['vital_id'],
                    'vital_category': category,
                    'display_name': row['display_name'],
                    'vital_value': vital_value,
                    'convo_id': row['convo_id'],
                    'message_id': row['message_id'],
                    'tool': row['tool'],
                    'actor_role': row['actor_role'],
                    'actor_user_id': row['actor_user_id'],
                    'unit': row['unit']
                }

                if category in grouped:
                    grouped[category].append(vital_entry)
                else:
                    grouped["other"].append(vital_entry)

            return {
                'patient_id': patient_id,
                'vitals': grouped['vitals'],
                'lifestyle': grouped['lifestyle'],
                'body_metrics': grouped['body_metrics'],
                'vaccines': grouped['vaccines'],
                'immunization': grouped['immunization'],
                'biological': grouped['biological'],
                'reproductive': grouped['reproductive'],
                'other': grouped['other'],
                'counts': {
                    'vitals': len(grouped['vitals']),
                    'lifestyle': len(grouped['lifestyle']),
                    'body_metrics': len(grouped['body_metrics']),
                    'vaccines': len(grouped['vaccines']),
                    'immunization': len(grouped['immunization']),
                    'biological': len(grouped['biological']),
                    'reproductive': len(grouped['reproductive']),
                    'other': len(grouped['other']),
                    'total': sum(len(v) for v in grouped.values())
                }
            }

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving latest medical vitals: {str(e)}")
            raise DatabaseError(f"Failed to retrieve latest medical vitals: {str(e)}")

    async def get_medical_vitals(
        self,
        patient_id: int,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get medical vitals history for a patient grouped by timestamp.

        Retrieves vitals history from medical_vitals_view (has vital_text and unit).

        Args:
            patient_id: ID of the patient
            limit: Maximum number of unique timestamps to return (default: 10)

        Returns:
            Dict[str, Any]: Medical vitals data with history grouped by timestamp

        Raises:
            ValidationError: If patient_id is invalid
            DatabaseError: If database operation fails
        """
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")

        if limit <= 0 or limit > 100:
            limit = 10

        try:
            # Query historical vitals from medical_vitals_view (has vital_text, unit)
            history_query = """
                SELECT
                    id,
                    patient_id,
                    doctor_name,
                    healthcare_provider_name,
                    recorded_at,
                    vital_id,
                    COALESCE(vital_category, 'other') AS vital_category,
                    display_name,
                    vital_value,
                    vital_text,
                    unit
                FROM public.medical_vitals_view
                WHERE patient_id = $1
                ORDER BY recorded_at DESC
                LIMIT $2
            """

            rows = await self.db_manager.fetch(history_query, patient_id, limit * 20)

            # Group by recorded_at to reconstruct records
            records_by_time = {}
            for row in rows:
                timestamp = row['recorded_at'].isoformat() if row['recorded_at'] else None

                if timestamp not in records_by_time:
                    records_by_time[timestamp] = {
                        'id': row['id'],
                        'patient_id': row['patient_id'],
                        'doctor_name': row['doctor_name'],
                        'healthcare_provider_name': row['healthcare_provider_name'],
                        'recorded_at': timestamp,
                        'vitals': []
                    }

                vital_entry = {
                    'vital_id': row['vital_id'],
                    'vital_text': row['vital_text'],
                    'display_name': row['display_name'],
                    'value': row['vital_value'],
                    'unit': row['unit'],
                    'category': row['vital_category']
                }
                records_by_time[timestamp]['vitals'].append(vital_entry)

            # Convert to list and limit
            vitals_records = [
                records_by_time[ts]
                for ts in sorted(records_by_time.keys(), reverse=True)[:limit]
            ]

            return {
                'patient_id': patient_id,
                'vitals': vitals_records,
                'total_count': len(vitals_records)
            }

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving medical vitals: {str(e)}")
            raise DatabaseError(f"Failed to retrieve medical vitals: {str(e)}")

    async def get_vital_history(
        self,
        patient_id: int,
        vital_id: int,
        limit: int = 30
    ) -> Dict[str, Any]:
        """Get historical values for a specific vital.

        Retrieves historical data points for a specific vital to display in a graph.
        Uses medical_vitals_view which has unit field.

        Args:
            patient_id: ID of the patient
            vital_id: ID from vital_reference_ranges table
            limit: Maximum number of historical points to return (default: 30)

        Returns:
            Dict[str, Any]: Historical vital data with timestamps and values

        Raises:
            ValidationError: If patient_id or vital_id is invalid
            DatabaseError: If database operation fails
        """
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")
        if not vital_id or vital_id <= 0:
            raise ValidationError("Valid vital ID is required")
        if limit <= 0 or limit > 1000:
            limit = 30

        try:
            # Query medical_vitals_view (has unit) filtered by vital_id
            query = """
                SELECT
                    vital_value,
                    display_name,
                    recorded_at,
                    unit
                FROM public.medical_vitals_view
                WHERE patient_id = $1 AND vital_id = $2
                ORDER BY recorded_at DESC
                LIMIT $3
            """

            rows = await self.db_manager.fetch(query, patient_id, vital_id, limit)

            history_points = []
            for row in rows:
                history_points.append({
                    'value': row['vital_value'],
                    'unit': row['unit'],
                    'display_name': row['display_name'],
                    'recorded_at': row['recorded_at'].isoformat() if row['recorded_at'] else None
                })

            # Reverse to get chronological order for graphing
            history_points.reverse()

            return {
                'patient_id': patient_id,
                'vital_id': vital_id,
                'history': history_points,
                'total_count': len(history_points)
            }

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving vital history: {str(e)}")
            raise DatabaseError(f"Failed to retrieve vital history: {str(e)}")

    # --- HELPER METHODS ---

    def _empty_response(self, patient_id: int) -> Dict[str, Any]:
        """Return empty response structure."""
        return {
            'patient_id': patient_id,
            'vitals': [],
            'lifestyle': [],
            'body_metrics': [],
            'vaccines': [],
            'immunization': [],
            'biological': [],
            'reproductive': [],
            'other': [],
            'counts': {
                'vitals': 0,
                'lifestyle': 0,
                'body_metrics': 0,
                'vaccines': 0,
                'immunization': 0,
                'biological': 0,
                'reproductive': 0,
                'other': 0,
                'total': 0
            }
        }


# Singleton instance
medical_vitals_service = MedicalVitalsService()