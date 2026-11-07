from typing import Dict, Any

from agents import function_tool
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError
from medicus_common.models.doctor.doctor_view import DoctorPerformanceMetricsResponse
from src.services.doctor.doctor_analytics_service import get_doctor_analytics


@function_tool
async def get_doctor_performance_metrics(
    doctor_id: int
) -> DoctorPerformanceMetricsResponse:
    """
    Retrieve doctor's performance analytics and engagement metrics.

    INTENT
    ------
    Use this tool when you need aggregated statistics about a doctor's:
    - Conversation volume (total conversations)
    - Engagement patterns (average conversation duration)
    - Patient reach (unique patients count)

    This tool queries the doctors_analytics_view materialized view.

    IMPORTANT: This is for ADMIN/KPI use only, not for real-time clinical decisions.

    STATE TRANSITION
    ----------------
    - Read-only retrieval from doctors_analytics_view.
    - Returns aggregated performance metrics.
    - Data is cached for 1 hour.
    - View is refreshed hourly via cron (not real-time).

    PARAMETERS
    ----------
    doctor_id : int
        Identifier of the doctor.

    RETURNS
    -------
    DoctorPerformanceMetricsResponse
        Doctor analytics including:
        - total_convos: Total number of conversations
        - avg_conversation_duration_hours: Average conversation duration in hours
        - unique_patients_count: Number of unique patients engaged

    HARD RULES
    ----------
    - Fetches from doctors_analytics_view (NOT doctors_view LIGHT or DETAILS).
    - Returns None if doctor not found or no conversation data exists.
    - DO NOT use this for identity (use LIGHT context).
    - DO NOT use this for profile details (use get_doctor_profile_details).
    - USE this for performance metrics, KPIs, and admin dashboards.
    - Data accuracy: ~1 hour lag (view refreshed hourly).
    """

    try:
        analytics = await get_doctor_analytics(doctor_id)

        if not analytics:
            return DoctorPerformanceMetricsResponse(
                doctor_id=doctor_id,
                found=False,
                message="Doctor analytics not found (may not have any conversation data yet)"
            )

        fields = {k: v for k, v in analytics.model_dump().items() if k in DoctorPerformanceMetricsResponse.model_fields}
        fields.update(doctor_id=doctor_id, found=True)
        return DoctorPerformanceMetricsResponse(**fields)

    except Exception as e:
        logger.error_with_context("Failed get_doctor_performance_metrics", error=str(e), doctor_id=doctor_id)
        raise DatabaseError(f"Failed to retrieve doctor performance metrics: {str(e)}")
