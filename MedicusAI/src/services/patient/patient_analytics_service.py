from medicus_common.core.database import db_manager
from medicus_common.models.patient.patient_view import PatientAnalyticsView


async def get_patient_analytics(patient_id: int) -> PatientAnalyticsView | None:
    """
    Retrieves patient engagement and health tracking analytics from patients_analytics_view.

    This view contains:
    - Engagement metrics (visits, conversations)
    - Health tracking (vitals frequency, consistency)
    - Clinical load (active conditions, medications, pending exams)
    - Compliance indicators

    Returns
    -------
    PatientAnalyticsView | None
        Object containing analytics data or None if not found.
    """

    query = """
    SELECT
        patient_id,
        total_visits,
        last_visit_date,
        avg_visits_per_month,
        vitals_recorded_count,
        last_vital_date,
        tracking_consistency_score,
        active_conditions_count,
        active_medications_count,
        pending_exams_count,
        total_conversations,
        last_conversation_date
    FROM patients_analytics_view
    WHERE patient_id = $1;
    """

    async with db_manager.get_connection() as conn:
        record = await conn.fetchrow(query, patient_id)

    if not record:
        return None

    analytics_data = dict(record)

    result = PatientAnalyticsView(**analytics_data)

    return result
