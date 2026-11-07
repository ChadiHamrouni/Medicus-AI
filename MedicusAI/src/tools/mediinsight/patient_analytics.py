from typing import Dict, Any

from agents import function_tool
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import DatabaseError
from medicus_common.models.patient.patient_view import PatientEngagementMetricsResponse
from src.services.patient.patient_analytics_service import get_patient_analytics


@function_tool
async def get_patient_engagement_metrics(
    patient_id: int
) -> PatientEngagementMetricsResponse:
    """
    Retrieve patient's engagement and health tracking analytics.

    INTENT
    ------
    Use this tool when you need aggregated metrics about a patient's:
    - Engagement patterns (visit frequency, conversation activity)
    - Health tracking (vitals recording frequency, consistency score)
    - Clinical load (active conditions count, active medications count, pending exams)
    - Compliance indicators (appointment adherence, tracking patterns)

    This tool queries the patients_analytics_view materialized view.

    IMPORTANT: This is for POPULATION HEALTH/TRACKING use only, not for clinical decisions.

    STATE TRANSITION
    ----------------
    - Read-only retrieval from patients_analytics_view.
    - Returns aggregated engagement and health tracking metrics.
    - Data is cached for 1 hour.
    - View is refreshed hourly via cron (not real-time).

    PARAMETERS
    ----------
    patient_id : int
        Identifier of the patient.

    RETURNS
    -------
    PatientEngagementMetricsResponse
        Patient analytics including:
        - total_visits: Total number of medical visits
        - last_visit_date: Most recent visit date
        - avg_visits_per_month: Average visit frequency
        - vitals_recorded_count: Number of vitals recorded
        - last_vital_date: Most recent vitals recording
        - tracking_consistency_score: Health tracking adherence score (0-100)
        - active_conditions_count: Count of active medical conditions
        - active_medications_count: Count of active medications
        - pending_exams_count: Count of pending medical examinations
        - total_conversations: Total conversation count
        - last_conversation_date: Most recent conversation

    HARD RULES
    ----------
    - Fetches from patients_analytics_view (NOT patients_view LIGHT or DETAILS).
    - Returns None if patient not found or no tracking data exists.
    - DO NOT use this for identity (use LIGHT context).
    - DO NOT use this for profile details (use get_patient_profile_details).
    - DO NOT use this for actual clinical data (use get_medical_vitals/conditions/etc).
    - USE this for engagement tracking, population health, and admin dashboards.
    - Data accuracy: ~1 hour lag (view refreshed hourly).
    """

    try:
        analytics = await get_patient_analytics(patient_id)

        if not analytics:
            return PatientEngagementMetricsResponse(
                patient_id=patient_id,
                found=False,
                message="Patient analytics not found (may not have tracking data yet)"
            )

        fields = {k: v for k, v in analytics.model_dump().items() if k in PatientEngagementMetricsResponse.model_fields}
        fields.update(patient_id=patient_id, found=True)
        return PatientEngagementMetricsResponse(**fields)

    except Exception as e:
        logger.error_with_context("Failed get_patient_engagement_metrics", error=str(e), patient_id=patient_id)
        raise DatabaseError(f"Failed to retrieve patient engagement metrics: {str(e)}")
