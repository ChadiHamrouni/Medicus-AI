from medicus_common.core.database import db_manager
from medicus_common.models.patient.patient_view import PatientView


async def get_patient_context(patient_id: int) -> PatientView | None:
    """
    Retrieves LIGHT patient identity context from patients_view (LIGHT version).

    ⚠️ IMPORTANT: This returns ONLY identity/static data, NOT clinical data.
    Clinical data must be fetched via tools when needed.

    Parameters
    ----------
    patient_id : int
        Patient's id
    doctor_id : int
        Doctor's id
    medicus_agent : MedicusAgent
        Mode determining level of detail (currently unused in light view)

    Returns
    -------
    PatientView (LIGHT)
        Object containing ONLY identity and static data:
        ✅ Personal details: name, dob, gender, relationship, wa_number
        ✅ Static lookups: country_name, language_name, current_age
        ✅ Status: status, created_at, updated_at
        ❌ NO clinical data (vitals, conditions, medications, procedures, visits)

    Clinical Data Access
    --------------------
    To get clinical data, Sara MUST call these tools:
    - get_medical_vitals() → vitals
    - get_medical_conditions() → conditions
    - get_medical_medications() → medications
    - get_medical_procedures() → procedures
    - get_medical_visits() → visits

    Notes
    -----
    The light view strategy ensures:
    - Sub-10ms load time (just identity, no CTEs)
    - Instant view refresh (no recalculating medical history)
    - Proper tool isolation (one tool = one transaction)
    - Clean context window (no clutter for Sara)
    """
    if not patient_id:
        return None

    query = """
    SELECT *
    FROM patients_view
    WHERE id = $1
    """

    # Time DB query
    async with db_manager.get_connection() as conn:
        record = await conn.fetchrow(query, patient_id)

    if not record:
        return None

    # Convert asyncpg.Record to dict
    patient_data = dict(record)

    # Normalize gender to lowercase (database has uppercase)
    if patient_data.get('gender'):
        patient_data['gender'] = patient_data['gender'].lower()

    result = PatientView(**patient_data)

    return result
    

