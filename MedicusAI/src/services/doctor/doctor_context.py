
from medicus_common.core.database import db_manager
from medicus_common.models.doctor.doctor_view import DoctorView


async def get_doctor_context(doctor_id: int) -> DoctorView:
    """
    Retrieves LIGHT doctor identity context from doctors_view (LIGHT version).

    ⚠️ IMPORTANT: This returns ONLY identity and lookup data.

    Returns
    -------
    DoctorView (LIGHT)
        Object containing ONLY:
        ✅ Core identity: id, user_id, name, prefix, wa_number, avatar_url
        ✅ Static lookups: country_name, region_name, specialty_name, language_name
        ✅ Status metadata: status, network_status, timestamps
        ❌ NO profile details (license, procedures, certifications, working_hours, address)
        ❌ NO analytics (conversation stats, performance metrics)

    Data Access
    -----------
    - Profile details → get_doctor_details() tool → doctors_details_view
    - Analytics/stats → get_doctor_analytics() → doctors_analytics_view
    """


    # Query LIGHT view only - no JSONB parsing needed
    query = """
    SELECT
        id, user_id, first_name, last_name, prefix, wa_number, avatar_url,
        specialty_id, specialty_name, super_category_id,
        country_id, country_name, region_id, region_name,
        language_id, language_name,
        gender,
        status, network_status,
        created_at, updated_at
    FROM doctors_view
    WHERE id = $1;
    """

    async with db_manager.get_connection() as conn:
        record = await conn.fetchrow(query, doctor_id)

    if not record:
        raise Exception("Doctor not found")

    doctor_data = dict(record)

    result = DoctorView(**doctor_data)

    return result

