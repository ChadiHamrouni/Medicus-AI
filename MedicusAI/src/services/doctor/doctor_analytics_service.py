from medicus_common.core.database import db_manager
from medicus_common.models.doctor.doctor_view import DoctorAnalyticsView


async def get_doctor_analytics(doctor_id: int) -> DoctorAnalyticsView | None:
    """
    Retrieves doctor performance analytics from doctors_analytics_view.

    This view contains:
    - Conversation statistics (total, average duration)
    - Patient engagement metrics (unique patients)
    - Performance indicators

    Returns
    -------
    DoctorAnalyticsView | None
        Object containing analytics data or None if not found.
    """

    query = """
    SELECT
        doctor_id,
        total_convos,
        avg_conversation_duration_hours,
        unique_patients_count
    FROM doctors_analytics_view
    WHERE doctor_id = $1;
    """

    async with db_manager.get_connection() as conn:
        record = await conn.fetchrow(query, doctor_id)

    if not record:
        return None

    analytics_data = dict(record)

    result = DoctorAnalyticsView(**analytics_data)

    return result
