"""Medical notes service for MedicusUser.

Provides medical notes operations using the medical_notes_view materialized view.
This service provides read-only access for patients to view their SOAP clinical notes.

WARNING: This endpoint is READ-ONLY.
All semantics live in MedicusAI agent tools.
This is a thin adapter layer for data transport only.
"""

import json
from typing import Dict, Any
from datetime import datetime

from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager


class NoteService:
    """
    Service class for patient medical notes operations.
    Thin adapter - queries view and returns data with minimal transformation.
    """

    def __init__(self):
        """Initialize the notes service."""
        self.db_manager = db_manager

    async def get_patient_notes(
        self,
        patient_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get all medical notes for a patient.

        Retrieves all SOAP clinical notes from medical_notes_view materialized view.
        Notes are ordered chronologically (most recent first).

        Args:
            patient_id: ID of the patient
            limit: Maximum number of results (default 100)
            offset: Number of results to skip (default 0)

        Returns:
            Dict containing notes list and total count
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
                FROM public.medical_notes_view
                WHERE patient_id = $1 AND status = 'active'
            """
            count_row = await self.db_manager.fetchrow(count_query, patient_id)
            total_count = count_row['total'] if count_row else 0

            # Get paginated notes
            query = """
                SELECT
                    id,
                    patient_id,
                    doctor_id,
                    doctor_name,
                    note_date,
                    note_details,
                    created_at,
                    updated_at
                FROM public.medical_notes_view
                WHERE patient_id = $1 AND status = 'active'
                ORDER BY note_date DESC, id DESC
                LIMIT $2 OFFSET $3
            """

            rows = await self.db_manager.fetch(query, patient_id, limit, offset)

            notes = [self._format_note(row) for row in rows]

            return {
                "patient_id": patient_id,
                "notes": notes,
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + len(notes) < total_count,
            }

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving notes: {str(e)}")
            raise DatabaseError(f"Failed to retrieve notes: {str(e)}")

    def _format_note(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Format a database row into a note dictionary."""

        # Format date
        note_date = row.get('note_date')
        if isinstance(note_date, datetime):
            note_date = note_date.date()
        formatted_date = note_date.isoformat() if note_date else None

        # asyncpg returns jsonb as text unless a codec is registered
        note_details = row.get('note_details') or {}
        if isinstance(note_details, str):
            note_details = json.loads(note_details)

        return {
            'id': row['id'],
            'patient_id': row['patient_id'],
            'doctor_id': row['doctor_id'],
            'doctor_name': row.get('doctor_name'),
            'note_date': formatted_date,
            'note_details': note_details,
        }


# Singleton instance
note_service = NoteService()