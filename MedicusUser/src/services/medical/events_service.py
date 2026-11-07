"""Medical events service for MedicusUser.

Provides medical events operations using the medical_events_view materialized view.
This view combines medical_visits, medical_examinations, and medical_exam_orders
into a unified timeline of patient medical events.

This service provides read-only access for patients to view their medical events.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager


class MedicalEventsService:
    """
    Service class for patient medical events operations using medical_events_view.
    Includes data formatting helpers for frontend consumption.
    """

    def __init__(self):
        """Initialize the medical events service."""
        self.db_manager = db_manager

    # --- PUBLIC API ---

    async def get_medical_events(
        self,
        patient_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get ALL medical events for a patient.

        Retrieves all medical events (visits, exams, exam orders) for a patient
        using the medical_events_view materialized view.

        Args:
            patient_id: ID of the patient
            limit: Maximum number of results (default 100)
            offset: Number of results to skip (default 0)

        Returns:
            List[Dict[str, Any]]: List of all medical event records
        """
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")
        if not 1 <= limit <= 500:
            raise ValidationError("Limit must be between 1 and 500")
        if offset < 0:
            raise ValidationError("Offset must be non-negative")

        try:
            query = """
                SELECT
                    id,
                    patient_id,
                    doctor_id,
                    doctor_name,
                    event_date,
                    event_time,
                    event_location,
                    event_type,
                    event_name,
                    healthcare_provider_name,
                    event_details,
                    event_summary,
                    status
                FROM public.medical_events_view
                WHERE patient_id = $1
                ORDER BY
                    CASE WHEN status = 'active' THEN 0 ELSE 1 END,
                    event_date DESC,
                    event_time DESC NULLS LAST
                LIMIT $2 OFFSET $3
            """

            rows = await self.db_manager.fetch(query, patient_id, limit, offset)

            # Use the integrated formatter method
            events = [self._format_event(row) for row in rows]

            return events

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving medical events: {str(e)}")
            raise DatabaseError(f"Failed to retrieve medical events: {str(e)}")

    # --- DATA FORMATTING HELPERS ---

    def _format_time_and_date(self, row: Dict[str, Any]) -> tuple[Optional[Any], Optional[Any]]:
        """Extracts and returns date and time objects (not strings)."""
        from datetime import time as time_type

        # Date - return as date object
        event_date = row.get('event_date')
        if isinstance(event_date, datetime):
            event_date = event_date.date()

        # Time - return as time object
        event_time = row.get('event_time')
        if event_time and isinstance(event_time, str):
            # Parse string time to time object
            try:
                hour, minute = event_time.split(':')
                event_time = time_type(int(hour), int(minute))
            except (ValueError, AttributeError):
                event_time = None

        return event_date, event_time

    def _get_frontend_type_and_status(self, row: Dict[str, Any]) -> tuple[str, str]:
        """Maps backend event_type and status to frontend equivalents."""

        # Event Type Mapping: keep exam_order and procedure separate for filtering
        event_type_mapping = {
            'appointment': 'visit',
            'visit': 'visit',
            'exam': 'exam',
            'exam_order': 'exam_order',
            'procedure': 'procedure'
        }
        frontend_type = event_type_mapping.get(row.get('event_type'), 'exam')

        # Status Mapping: 'active' -> 'scheduled', 'past' -> 'completed'
        status_mapping = {
            'active': 'scheduled',
            'past': 'completed'
        }
        frontend_status = status_mapping.get(row.get('status'), 'scheduled')

        return frontend_type, frontend_status

    def _format_title(self, event_name: Optional[str]) -> str:
        """Converts an enum-style name (e.g., 'follow_up') to a readable title."""
        if event_name:
            # e.g., 'follow_up' -> 'Follow Up'
            return event_name.replace('_', ' ').title()
        return 'Medical Event'

    def _format_location(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Parses and formats the location data, extracting coordinates and address."""

        location_raw = row.get('event_location')

        # Default return values
        location_data = {
            'location': 'N/A',
            'latitude': None,
            'longitude': None,
        }

        if not location_raw:
            return location_data

        location_dict: Optional[Dict[str, Any]] = None

        try:
            # Step 1: Handle raw string data (try JSON load first)
            if isinstance(location_raw, str):
                location_str = location_raw.strip()
                if location_str and location_str not in ('{}', '{ }', 'null', 'None', '""', "''", ''):
                    try:
                        location_dict = json.loads(location_str)
                    except json.JSONDecodeError:
                        # If not JSON, treat the whole string as the location name
                        location_data['location'] = location_str
                        return location_data

            # Step 2: Handle dict (parsed from string or already a dict)
            elif isinstance(location_raw, dict):
                location_dict = location_raw

            if location_dict and isinstance(location_dict, dict):
                # Extract coordinates
                location_data['latitude'] = location_dict.get('latitude') or location_dict.get('lat')
                location_data['longitude'] = location_dict.get('longitude') or location_dict.get('lng')

                # Prioritize 'name' if available (e.g., "Main Clinic")
                if location_dict.get('name'):
                    location_data['location'] = location_dict['name']
                else:
                    # Construct the address string
                    parts = []
                    for key in ['line1', 'city', 'state', 'postal_code']:
                        if location_dict.get(key):
                            parts.append(location_dict[key])

                    if parts:
                        location_data['location'] = ', '.join(parts)
                    elif location_dict.get('line2'):
                        location_data['location'] = location_dict['line2']

        except Exception as e:
            logger.warning(f"Error formatting location for event {row.get('id')}: {str(e)}")
            location_data['location'] = 'N/A'

        return location_data

    # --- Main Formatting Method ---

    def _format_event(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Format a database row into MedicalEventEntry structure matching Pydantic model."""

        # 1. Date and Time
        scheduled_date, scheduled_time = self._format_time_and_date(row)

        # 2. Location Formatting
        location_data = self._format_location(row)

        # 3. Event Details Handling
        event_details = row.get('event_details')
        # Convert JSONB to dict if needed
        if event_details and isinstance(event_details, str):
            try:
                parsed = json.loads(event_details)
                # Only use if it's a dict, not a plain string
                event_details = parsed if isinstance(parsed, dict) else None
            except (json.JSONDecodeError, ValueError):
                event_details = None

        # 4. Handle None event_name - use default "Medical Event"
        event_name = row.get('event_name')
        if not event_name:
            event_name = 'Medical Event'

        # 5. Handle status - map 'cancelled' to 'past', only allow 'active' or 'past'
        status = row.get('status', 'active')
        if status not in ('active', 'past'):
            status = 'past'  # Default cancelled/other statuses to past

        # 6. Return structure matching MedicalEventEntry Pydantic model
        return {
            'event_id': row['id'],
            'patient_id': row['patient_id'],
            'doctor_id': row['doctor_id'],
            'doctor_name': row['doctor_name'],
            'event_date': scheduled_date,  # date object
            'event_time': scheduled_time,  # time object
            'event_location': location_data['location'],
            'event_type': row['event_type'],
            'event_name': event_name,
            'event_details': event_details,
            'event_summary': row.get('event_summary'),
            'healthcare_provider_name': row.get('healthcare_provider_name'),
            'status': status
        }


# Singleton instance
medical_events_service = MedicalEventsService()