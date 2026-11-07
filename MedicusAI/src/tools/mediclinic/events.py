from typing import Optional, Dict, Any, List

from agents import function_tool  

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError, DatabaseError

from medicus_common.models.medical.events import (
    MedicalEventRecord,
    MedicalEventsResponse,
    build_event_entry,
    sort_events
)


@function_tool
async def get_medical_events(
    patient_id: int,
    event_types: Optional[List[str]] = None,
    status: Optional[str] = None,
    limit: Optional[int] = None
) -> Dict[str, Any]:
    """
    Retrieve a unified chronological timeline of a patient's medical events.

    INTENT
    ------
    Use this tool to present a high-level overview of the patient's care history
    across visits, procedures, examinations, and orders.

    STATE TRANSITION
    ----------------
    - Read-only aggregation.
    - Combines multiple medical domains into a single ordered timeline.
    - Does NOT modify any records.

    PARAMETERS
    ----------
    patient_id : int
        Identifier of the patient.

    event_types : list[str], optional
        Restrict results to specific event categories
        (e.g., ["visit", "procedure", "exam"]).

    status : str, optional
        Filter events by lifecycle state:
        - "active"
        - "past"

    limit : int, optional
        Maximum number of events to return.

    RETURNS
    -------
    Dict[str, Any]
        Chronologically ordered list of medical events with metadata.

    HARD RULES
    ----------
    - MUST preserve event ordering.
    - MUST NOT fabricate missing events.
    """

    if not isinstance(patient_id, int):
        raise ValidationError("patient_id must be an integer.")

    # Build query with filters
    # IMPORTANT: Deterministic ordering by event_date DESC, event_time DESC NULLS LAST, event_id DESC
    # (prevents UI flicker when multiple events share same date or time)
    query = """
        SELECT *
        FROM public.medical_events_view
        WHERE patient_id = $1 AND status IN ('active', 'past')
    """
    params = [patient_id]
    param_counter = 2

    # Add event_types filter
    if event_types:
        placeholders = ", ".join([f"${i}" for i in range(param_counter, param_counter + len(event_types))])
        query += f" AND event_type IN ({placeholders})"
        params.extend(event_types)
        param_counter += len(event_types)

    # Add status filter
    if status:
        query += f" AND status = ${param_counter}"
        params.append(status)
        param_counter += 1

    # Add deterministic ordering
    query += """
        ORDER BY
            event_date DESC,
            event_time DESC NULLS LAST,
            id DESC
    """

    # Add limit if specified
    if limit is not None:
        query += f" LIMIT {int(limit)}"

    try:
        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(query, *params)

        # Convert database rows to MedicalEventEntry objects
        all_entries = []
        for row in rows:
            # Handle event_details - may be dict, string, or None
            event_details = row.get('event_details')
            if isinstance(event_details, str):
                event_details = {"description": event_details}
            elif event_details is None:
                event_details = {}

            # Build internal record
            record = MedicalEventRecord(
                event_id=row['id'],
                patient_id=row['patient_id'],
                doctor_id=row['doctor_id'],
                doctor_name=row['doctor_name'],
                event_date=row['event_date'],
                event_time=row.get('event_time'),
                event_location=row.get('event_location'),
                event_type=row['event_type'],
                event_name=row.get('event_name') or "",
                event_details=event_details,
                event_summary=row.get('event_summary'),
                healthcare_provider_name=row.get('healthcare_provider_name'),
                status=row['status']
            )

            # Build external semantic entry (no transformation, status pre-computed)
            entry = build_event_entry(record)
            all_entries.append(entry)

        # Sort events chronologically (most recent first)
        sorted_entries = sort_events(all_entries)

        # Build response using MedicalEventsResponse structure
        response = MedicalEventsResponse(
            patient_id=patient_id,
            events=sorted_entries,
            total=len(sorted_entries),
            limit=limit if limit is not None else len(sorted_entries),
            offset=0
        )

        return response.model_dump()

    except Exception as e:
        logger.error("Failed get_medical_events", exc_info=True)
        raise DatabaseError(f"Failed to retrieve medical events: {str(e)}")