# =============================================================================
# src/services/doctor/doctor_events_service.py
"""Doctor events service for managing doctor calendar/events."""

from datetime import date
from typing import Dict, Any, Optional

from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import DatabaseError
from medicus_common.core.logging_config import logger


class DoctorEventsService:
    """Service for retrieving doctor events (visits and procedures)."""

    @staticmethod
    async def get_doctor_events(
        doctor_id: int,
        limit: int = 100,
        offset: int = 0,
        status_filter: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        patient_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get events for a doctor from doctors_events_view.

        Args:
            doctor_id: Doctor ID
            limit: Maximum number of events to return (default: 100)
            offset: Number of events to skip for pagination (default: 0)
            status_filter: Filter by status ('active' or 'past')
            date_from: Filter events from this date (inclusive)
            date_to: Filter events to this date (inclusive)
            patient_id: Filter events by specific patient

        Returns:
            dict: {
                "events": List of event dictionaries,
                "total": Total count of matching events,
                "limit": Query limit,
                "offset": Query offset
            }
        """
        try:
            # Build base query
            base_query = """
                SELECT
                    id,
                    doctor_id,
                    patient_id,
                    patient_name,
                    event_date,
                    event_time,
                    event_location,
                    event_type,
                    event_name,
                    event_details,
                    event_summary,
                    healthcare_provider_name,
                    status
                FROM doctors_events_view
                WHERE doctor_id = $1
            """

            conditions = []
            params = [doctor_id]
            param_count = 2

            # Add status filter
            if status_filter:
                conditions.append(f"status = ${param_count}")
                params.append(status_filter)
                param_count += 1

            # Add date range filters
            if date_from:
                conditions.append(f"event_date >= ${param_count}")
                params.append(date_from)
                param_count += 1

            if date_to:
                conditions.append(f"event_date <= ${param_count}")
                params.append(date_to)
                param_count += 1

            # Add patient filter
            if patient_id:
                conditions.append(f"patient_id = ${param_count}")
                params.append(patient_id)
                param_count += 1

            # Apply conditions
            if conditions:
                base_query += " AND " + " AND ".join(conditions)

            # Build count query
            count_query = f"SELECT COUNT(*) FROM ({base_query}) AS subquery"

            # Execute count query
            total_count = await db_manager.fetchval(count_query, *params)

            # Add ordering and pagination
            base_query += " ORDER BY event_date DESC, event_time DESC NULLS LAST"
            base_query += f" LIMIT {limit} OFFSET {offset}"

            # Execute main query
            rows = await db_manager.fetch(base_query, *params)

            # Process results
            events = []
            for row in rows:
                event = dict(row)

                # Parse event_details JSONB if present
                # event_details must be a dict or None, not a string
                if event.get('event_details'):
                    import json
                    if isinstance(event['event_details'], str):
                        try:
                            # Try to parse as JSON
                            parsed_value = json.loads(event['event_details'])
                            if isinstance(parsed_value, dict):
                                event['event_details'] = parsed_value
                            else:
                                event['event_details'] = {"note": parsed_value}
                        except json.JSONDecodeError:
                            event['event_details'] = {"note": event['event_details']}
                    elif not isinstance(event['event_details'], dict):
                        # If it's neither string nor dict, convert to dict
                        event['event_details'] = {"value": str(event['event_details'])}
                else:
                    # Set to None if empty/null
                    event['event_details'] = None

                events.append(event)

            logger.info(
                f"Retrieved {len(events)} events for doctor {doctor_id}",
                extra={
                    "component": "DoctorEventsService",
                    "doctor_id": doctor_id,
                    "total": total_count,
                    "status_filter": status_filter,
                    "date_from": date_from,
                    "date_to": date_to,
                    "patient_id": patient_id
                }
            )

            return {
                "events": events,
                "total": total_count or 0,
                "limit": limit,
                "offset": offset
            }

        except Exception as e:
            logger.error(
                f"Failed to get doctor events: {str(e)}",
                extra={
                    "component": "DoctorEventsService",
                    "doctor_id": doctor_id
                }
            )
            raise DatabaseError(f"Failed to retrieve doctor events: {e}")