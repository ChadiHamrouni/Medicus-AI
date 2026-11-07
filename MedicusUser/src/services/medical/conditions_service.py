"""Medical conditions service for MedicusUser.

VIEW SCHEMA (medical_conditions_latest_view and medical_conditions_view):
- id, patient_id, doctor_id, doctor_name
- diagnosis_date, condition_id, condition_text, display_name
- icd10, category, severity, is_chronic
- resolved_date, is_active, clinical_notes, created_at, clinical_status

Views JOIN with conditions knowledge base for icd10, category, is_chronic.
clinical_status computed by view (resolved > chronic > active).

This service provides read-only access for patients to view their medical conditions.
"""

from typing import Dict, Any, Optional
from datetime import datetime, date

from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger
from medicus_common.core.database import db_manager

from medicus_common.models.medical.conditions import (
    MedicalConditionRecord,
    MedicalConditionsResponse,
    project_condition_status,
    build_condition_entry,
    group_conditions_by_status,
    calculate_condition_counts
)


class MedicalConditionsService:
    """Service class for patient medical conditions operations."""

    def __init__(self):
        """Initialize the medical conditions service."""
        self.db_manager = db_manager

    # --- PUBLIC API ---

    async def get_conditions(
        self,
        patient_id: int,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get medical conditions for a patient, grouped by status.

        Returns conditions as semantic entries grouped into:
        - active: Currently active non-chronic conditions
        - chronic: Long-term chronic conditions
        - resolved: Previously active conditions that have been resolved

        Args:
            patient_id: ID of the patient
            status_filter: Optional filter ('active', 'chronic', 'resolved')

        Returns:
            Dict[str, Any]: Conditions grouped by status as MedicalConditionsResponse

        Raises:
            ValidationError: If patient_id is invalid
            DatabaseError: If database operation fails
        """
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")

        if status_filter and status_filter not in ('active', 'chronic', 'resolved'):
            raise ValidationError("status_filter must be 'active', 'chronic', or 'resolved'")

        try:
            # Query view - all columns match view schema
            query = """
                SELECT
                    id,
                    patient_id,
                    doctor_id,
                    doctor_name,
                    diagnosis_date,
                    condition_id,
                    condition_text,
                    display_name,
                    icd10,
                    category,
                    severity,
                    is_chronic,
                    resolved_date,
                    is_active,
                    clinical_notes,
                    created_at,
                    clinical_status
                FROM public.medical_conditions_view
                WHERE patient_id = $1
                ORDER BY diagnosis_date DESC NULLS LAST
            """

            rows = await self.db_manager.fetch(query, patient_id)

            logger.info(f"[CONDITIONS] Patient {patient_id}: Got {len(rows)} rows from view")

            # Convert database rows to MedicalConditionEntry objects
            all_entries = []
            for row in rows:
                # Handle None display_name - use condition_text or default
                display_name = row.get('display_name')
                if not display_name:
                    display_name = row.get('condition_text') or 'Unknown Condition'

                # Build internal record matching view schema
                record = MedicalConditionRecord(
                    id=row['id'],
                    patient_id=row['patient_id'],
                    doctor_id=row.get('doctor_id'),
                    doctor_name=row.get('doctor_name'),
                    diagnosis_date=row.get('diagnosis_date'),
                    condition_id=row.get('condition_id'),
                    condition_text=row.get('condition_text'),
                    display_name=display_name,
                    icd10=row.get('icd10'),
                    category=row.get('category'),
                    severity=row.get('severity'),
                    is_chronic=row.get('is_chronic', False),
                    resolved_date=row.get('resolved_date'),
                    is_active=row.get('is_active', True),
                    clinical_notes=row.get('clinical_notes'),
                    created_at=row['created_at'],
                    clinical_status=row.get('clinical_status')
                )

                # Use clinical_status from view as SOURCE OF TRUTH (fallback to computed)
                status = row.get('clinical_status') or project_condition_status(record)

                # Build external semantic entry
                entry = build_condition_entry(
                    record,
                    status,
                    doctor_name=row.get('doctor_name')
                )

                # Apply status filter if specified
                if status_filter and entry.clinical_status != status_filter:
                    continue

                all_entries.append(entry)

            # Group entries by status
            grouped = group_conditions_by_status(all_entries)

            # Build explicit counts
            counts = calculate_condition_counts(all_entries)

            # Build response using MedicalConditionsResponse structure
            response = MedicalConditionsResponse(
                patient_id=patient_id,
                active=grouped["active"],
                chronic=grouped["chronic"],
                resolved=grouped["resolved"],
                counts=counts
            )

            return response.model_dump()

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving medical conditions: {str(e)}")
            raise DatabaseError(f"Failed to retrieve medical conditions: {str(e)}")

    async def get_medical_conditions(
        self,
        patient_id: int,
        is_active: Optional[bool] = None,
        is_chronic: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get medical conditions for a patient as a flat list.

        DEPRECATED: Maintained for backward compatibility.
        New code should use get_conditions() which returns grouped response.

        Args:
            patient_id: ID of the patient
            is_active: Filter by active status (optional)
            is_chronic: Filter by chronic status (optional)
            limit: Maximum number of results (default 100)
            offset: Number of results to skip (default 0)

        Returns:
            Dict containing:
                - conditions: List of medical condition records
                - total: Total number of conditions
                - active_count: Number of active conditions
                - chronic_count: Number of chronic conditions
        """
        if not patient_id or patient_id <= 0:
            raise ValidationError("Valid patient ID is required")
        if not 1 <= limit <= 500:
            raise ValidationError("Limit must be between 1 and 500")
        if offset < 0:
            raise ValidationError("Offset must be non-negative")

        try:
            # Get grouped response
            grouped_response = await self.get_conditions(patient_id)

            # Flatten into legacy format
            all_conditions = []

            # Active conditions
            for cond in grouped_response.get('active', []):
                condition = self._convert_to_legacy_format(cond)
                all_conditions.append(condition)

            # Chronic conditions
            for cond in grouped_response.get('chronic', []):
                condition = self._convert_to_legacy_format(cond)
                all_conditions.append(condition)

            # Resolved conditions
            for cond in grouped_response.get('resolved', []):
                condition = self._convert_to_legacy_format(cond)
                all_conditions.append(condition)

            # Apply legacy filters
            if is_active is not None:
                all_conditions = [c for c in all_conditions if c['is_active'] == is_active]

            if is_chronic is not None:
                all_conditions = [c for c in all_conditions if c['is_chronic'] == is_chronic]

            # Get counts from response
            counts = grouped_response.get('counts', {})

            # Apply limit and offset
            paginated_conditions = all_conditions[offset:offset + limit]

            return {
                'patient_id': patient_id,
                'conditions': paginated_conditions,
                'total': counts.get('total', 0),
                'active_count': counts.get('active', 0),
                'chronic_count': counts.get('chronic', 0)
            }

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Database error retrieving medical conditions: {str(e)}")
            raise DatabaseError(f"Failed to retrieve medical conditions: {str(e)}")

    # --- DATA FORMATTING HELPERS ---

    def _convert_to_legacy_format(self, cond: Dict[str, Any]) -> Dict[str, Any]:
        """Convert new MedicalConditionEntry format to legacy format.

        Args:
            cond: MedicalConditionEntry dict

        Returns:
            Dict formatted for legacy UI
        """
        # Determine is_active and is_chronic from clinical_status
        status = cond.get('clinical_status')
        is_active = status in ('active', 'chronic')
        is_chronic = status == 'chronic'

        # Calculate duration
        duration_years = self._calculate_duration_years(
            cond.get('diagnosis_date'),
            cond.get('resolved_date')
        )

        # Get status label and color
        status_label = self._get_status_label(
            is_active,
            is_chronic,
            cond.get('resolved_date')
        )
        severity_color = self._get_severity_color(cond.get('severity'))

        return {
            'condition_id': cond.get('id'),
            'knowledge_base_id': cond.get('condition_id'),  # FK to conditions table
            'patient_id': cond.get('patient_id'),
            'doctor_id': cond.get('doctor_id'),
            'doctor_name': cond.get('doctor_name'),
            'condition_name': cond.get('display_name'),  # Use display_name for UI
            'condition_text': cond.get('condition_text'),
            'icd10': cond.get('icd10'),
            'category': cond.get('category'),
            'severity': cond.get('severity'),
            'is_chronic': is_chronic,
            'diagnosis_date': self._format_date(cond.get('diagnosis_date')),
            'resolved_date': self._format_date(cond.get('resolved_date')),
            'is_active': is_active,
            'notes': cond.get('clinical_notes'),
            'created_at': self._format_date(cond.get('created_at')),
            # Computed fields for frontend
            'duration_years': duration_years,
            'status_label': status_label,
            'severity_color': severity_color
        }

    def _format_date(self, date_value: Any) -> Optional[str]:
        """Format date to ISO string."""
        if not date_value:
            return None

        if isinstance(date_value, (date, datetime)):
            return date_value.isoformat()
        if isinstance(date_value, str):
            return date_value

        return None

    def _calculate_duration_years(
        self,
        diagnosis_date: Any,
        resolved_date: Any
    ) -> Optional[float]:
        """Calculate duration in years from diagnosis to resolution or current date."""
        if not diagnosis_date:
            return None

        try:
            # Convert to date objects
            start_date = diagnosis_date if isinstance(diagnosis_date, date) else date.fromisoformat(str(diagnosis_date))

            if resolved_date:
                end_date = resolved_date if isinstance(resolved_date, date) else date.fromisoformat(str(resolved_date))
            else:
                end_date = date.today()

            duration_days = (end_date - start_date).days
            return round(duration_days / 365.25, 1)  # Account for leap years

        except Exception as e:
            logger.warning(f"Error calculating duration: {str(e)}")
            return None

    def _get_status_label(self, is_active: bool, is_chronic: bool, resolved_date: Any) -> str:
        """Get human-readable status label."""
        if resolved_date:
            return "Resolved"
        if is_chronic:
            return "Chronic"
        if is_active:
            return "Active"
        return "Inactive"

    def _get_severity_color(self, severity: Optional[str]) -> Optional[str]:
        """Get color code for severity indicator."""
        severity_colors = {
            'mild': '#10B981',      # green
            'moderate': '#F59E0B',  # amber
            'severe': '#EF4444',    # red
            'critical': '#DC2626'   # dark red
        }
        return severity_colors.get(severity.lower() if severity else '')


# Singleton instance
medical_conditions_service = MedicalConditionsService()