"""Medical procedures service for MedicusUser.

Provides medical procedures operations using the procedures_view materialized view.
This service provides read-only access for patients to view their medical procedures.

WARNING: This endpoint is READ-ONLY.
All semantics live in MedicusAI agent tools.
This is a thin adapter layer for data transport only.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import json


from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager


class ProcedureService:
    """
    Service class for patient medical procedures operations.
    Thin adapter - queries view and returns data with minimal transformation.
    """

    def __init__(self):
        """Initialize the procedures service."""
        self.db_manager = db_manager

    async def get_patient_procedures(
        self,
        patient_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get all medical procedures for a patient.

        Retrieves all medical procedures (scheduled, completed, cancelled)
        from procedures_view materialized view.

        Args:
            patient_id: ID of the patient
            limit: Maximum number of results (default 100)
            offset: Number of results to skip (default 0)

        Returns:
            Dict containing procedures grouped by status and counts
        """
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")
        if not 1 <= limit <= 500:
            raise ValidationError("Limit must be between 1 and 500")
        if offset < 0:
            raise ValidationError("Offset must be non-negative")

        try:
            # Get total count (not limited by pagination)
            count_query = """
                SELECT COUNT(*) as total
                FROM public.medical_procedures_view
                WHERE patient_id = $1
            """
            count_row = await self.db_manager.fetchrow(count_query, patient_id)
            total_count = count_row['total'] if count_row else 0

            # Get paginated procedures - use SELECT * to get all available columns
            query = """
                SELECT *
                FROM public.medical_procedures_view
                WHERE patient_id = $1
                ORDER BY
                    scheduled_date ASC,
                    scheduled_time ASC NULLS LAST
                LIMIT $2 OFFSET $3
            """

            rows = await self.db_manager.fetch(query, patient_id, limit, offset)

            # Format procedures
            all_procedures = [self._format_procedure(row) for row in rows]

            return {
                "patient_id": patient_id,
                "procedures_list": all_procedures,
                "counts": total_count,
                "limit": limit,
                "offset": offset
            }

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving procedures: {str(e)}", exc_info=True)
            raise DatabaseError(f"Failed to retrieve procedures: {str(e)}")

    async def get_procedure_by_id(
        self,
        procedure_id: int,
        patient_id: int
    ) -> Dict[str, Any]:
        """Get a single procedure by ID with clinical details.

        Retrieves a procedure with its complete clinical events log from
        medical_procedure_details_view.

        Args:
            procedure_id: ID of the procedure
            patient_id: ID of the patient (for authorization)

        Returns:
            Dict containing procedure data with clinical events

        Raises:
            ValidationError: If IDs are invalid or procedure not found
            DatabaseError: If database operation fails
        """
        if not procedure_id or procedure_id <= 0:
            raise ValidationError("Valid procedure ID is required")
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")

        try:
            # Get procedure with clinical events - note: mpv already has clinical_events_log
            query = """
                SELECT *
                FROM public.medical_procedures_view
                WHERE id = $1 AND patient_id = $2
            """

            row = await self.db_manager.fetchrow(query, procedure_id, patient_id)

            if not row:
                raise ValidationError(f"Procedure {procedure_id} not found for patient {patient_id}")

            procedure = self._format_procedure(row)

            return procedure

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving procedure {procedure_id}: {str(e)}")
            raise DatabaseError(f"Failed to retrieve procedure: {str(e)}")

    def _format_procedure(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Format a database row into a procedure dictionary using available view columns."""

        # Format date - handle date, datetime, and string
        scheduled_date = row.get('scheduled_date')
        formatted_date = None
        if scheduled_date:
            if isinstance(scheduled_date, str):
                formatted_date = scheduled_date
            elif isinstance(scheduled_date, datetime):
                formatted_date = scheduled_date.date().isoformat()
            else:
                formatted_date = scheduled_date.isoformat()

        # Format time - handle time, datetime, and string
        scheduled_time = row.get('scheduled_time')
        formatted_time = None
        if scheduled_time:
            if isinstance(scheduled_time, str):
                formatted_time = scheduled_time
            elif hasattr(scheduled_time, 'strftime'):
                formatted_time = scheduled_time.strftime('%H:%M')
            else:
                formatted_time = str(scheduled_time)

        return {
            # Core identifiers
            'id': row['id'],
            'patient_id': row['patient_id'],

            # Scheduling (from view)
            'scheduled_date': formatted_date,
            'scheduled_time': formatted_time,

            # Display name (resolved: COALESCE(procedure.name, procedure_text))
            'display_name': row.get('display_name'),

            # Clinical Reference Data (from view - populated after coding)
            'procedure_code': row.get('procedure_code'),
            'cpt_code': row.get('cpt_code'),
            'icd10_pcs_code': row.get('icd10_pcs_code'),

            # Provenance (from view)
            'doctor_id': row.get('doctor_id'),
            'doctor_name': row.get('doctor_name'),
            'hc_provider_id': row.get('hc_provider_id'),
            'healthcare_provider_name': row.get('healthcare_provider_name'),

            # Location (raw JSON from view)
            'location': self._parse_json_field(row.get('location')),

            # Procedure execution (from view)
            'summary': self._parse_json_field(row.get('summary')),

            # Status (computed: scheduled, active, completed, cancelled, missed)
            'status': row.get('status'),
            'cancelled_at': self._format_datetime(row.get('cancelled_at')),
            'completed_at': self._format_datetime(row.get('completed_at')),

            # Metadata (from view)
            'created_at': self._format_datetime(row.get('created_at')),
            'updated_at': self._format_datetime(row.get('updated_at')),
        }

    def _format_datetime(self, dt: Any) -> Optional[str]:
        """Safely format datetime to ISO string."""
        if not dt:
            return None
        if isinstance(dt, str):
            return dt
        if isinstance(dt, datetime):
            return dt.isoformat()
        return str(dt)

    def _parse_json_field(self, field: Any) -> Any:
        """Parse JSON field that might be a string or already parsed."""
        if field is None:
            return None
        if isinstance(field, str):
            try:
                return json.loads(field)
            except (json.JSONDecodeError, ValueError):
                return field
        return field

    def _format_location_data(self, location_raw: Any) -> tuple:
        """
        Parse and format location data.

        Returns:
            tuple: (location_dict, formatted_location_string, latitude, longitude)
        """
        # Parse if string
        location_dict = self._parse_json_field(location_raw)

        if not location_dict or not isinstance(location_dict, dict):
            return (location_dict, None, None, None)

        # Extract coordinates
        latitude = location_dict.get('latitude') or location_dict.get('lat')
        longitude = location_dict.get('longitude') or location_dict.get('lng') or location_dict.get('lon')

        # Build formatted location string
        # Priority: name > hospital/clinic + room/wing > address components
        formatted_parts = []

        # Check for name first
        if location_dict.get('name'):
            formatted_parts.append(location_dict['name'])

        # Check for hospital/clinic + room/wing structure
        elif location_dict.get('hospital') or location_dict.get('clinic'):
            facility = location_dict.get('hospital') or location_dict.get('clinic')
            formatted_parts.append(facility)

            if location_dict.get('room'):
                formatted_parts.append(f"Room {location_dict['room']}")
            elif location_dict.get('wing'):
                formatted_parts.append(f"Wing {location_dict['wing']}")

        # Check for standard address components
        else:
            for key in ['line1', 'street', 'address']:
                if location_dict.get(key):
                    formatted_parts.append(location_dict[key])
                    break

            for key in ['city', 'state', 'postal_code', 'zip']:
                if location_dict.get(key):
                    formatted_parts.append(location_dict[key])

        formatted_location = ', '.join(formatted_parts) if formatted_parts else None

        return (location_dict, formatted_location, latitude, longitude)


# Singleton instance
procedure_service = ProcedureService()