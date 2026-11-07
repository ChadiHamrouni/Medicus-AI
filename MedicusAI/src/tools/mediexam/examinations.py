from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone

from agents import function_tool

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.models.medical.exams import ExaminationsSimpleResponse


@function_tool
async def get_medical_examinations(
    patient_id: int,
    time_range: Optional[str] = None,
    pending_only: bool = False
) -> ExaminationsSimpleResponse:
    """
    Retrieve a unified diagnostic timeline for a patient.

    INTENT
    ------
    Use this tool to answer questions about:
    - Pending diagnostic orders (future exams)
    - Completed diagnostic results (past exams)
    - The full diagnostic history across labs and imaging

    This tool implements a CQRS pattern by unifying:
    1. medical_exam_orders_view → pending / future exams
    2. medical_examinations_view → completed / historical exams

    WHEN TO USE
    -----------
    - "What labs have I had?"
    - "Do I have any pending exams?"
    - "Show my MRI results from last year"
    - "What tests are coming up?"

    PARAMETERS
    ----------
    patient_id : int
        Unique identifier of the patient whose exams are requested.

    time_range : str, optional
        Temporal filter applied ONLY to completed exams.
        Accepts:
        - ISO dates (e.g., "2024-01-01")
        - Natural language ranges (e.g., "last 6 months", "past year")
        Defaults to the last 3 years if omitted.

    pending_only : bool
        If True:
        - Returns ONLY pending exam orders
        - Skips completed exam results entirely

    RETURNS
    -------
    Dict[str, Any]
        A structured response containing:
        - pending (List[Dict]): Active exam orders awaiting completion
        - completed (List[Dict]): Finished exams with results
        - total_count (int): Total records returned

    STATE BEHAVIOR
    --------------
    - Read-only tool
    - Does NOT modify patient data
    - Reflects latest materialized views

    HARD RULES
    ----------
    - Do NOT use this tool to create or update exams
    - For new orders → use order_medical_exam
    - For completed results → use report_medical_exam
    """

    if not isinstance(patient_id, int):
        raise ValidationError("patient_id must be an integer.")

    # 1. Handle Time Filter for Completed Exams
    if not time_range:
        three_years_ago = (datetime.now(timezone.utc) - timedelta(days=3 * 365)).date()
        time_filter = f"exam_date >= '{three_years_ago}'"
    else:
        time_filter = f"exam_date >= '{time_range}'"

    # 2. SQL Query Construction
    query_orders = """
        SELECT 
            id, patient_id, doctor_id, doctor_name, 
            exam_type, ordered_exam AS display_name,
            NULL::date AS exam_date,
            hc_provider_id, healthcare_provider_name,
            NULL::jsonb AS exam_results,
            NULL::text AS exam_summary,
            created_at, 'pending' AS status
        FROM public.medical_exam_orders_view
        WHERE patient_id = $1
    """

    query_completed = f"""
        SELECT 
            id, patient_id, doctor_id, doctor_name, 
            exam_type, exam_type::text AS display_name,
            exam_date,
            hc_provider_id, healthcare_provider_name,
            exam_results,
            exam_summary,
            created_at, 'completed' AS status
        FROM public.medical_examinations_view
        WHERE patient_id = $1 AND {time_filter}
    """

    query = query_orders if pending_only else f"{query_orders} UNION ALL {query_completed} ORDER BY created_at DESC"

    try:
        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(query, patient_id)

        # 3. Data Transformation
        all_entries = []
        for row in rows:
            all_entries.append({
                "id": row['id'],
                "patient_id": row['patient_id'],
                "doctor_id": row['doctor_id'],
                "doctor_name": row['doctor_name'],
                "exam_type": row['exam_type'],
                "display_name": row['display_name'],
                "exam_date": row['exam_date'],
                "hc_provider_id": row['hc_provider_id'],
                "healthcare_provider_name": row['healthcare_provider_name'],
                "results": row['exam_results'],
                "summary": row['exam_summary'],
                "status": row['status'],
                "created_at": row['created_at']
            })

        return ExaminationsSimpleResponse(
            pending=[e for e in all_entries if e['status'] == 'pending'],
            completed=[e for e in all_entries if e['status'] == 'completed'],
            total_count=len(all_entries)
        )

    except Exception as e:
        logger.error(f"Failed to fetch unified examinations for patient {patient_id}: {str(e)}")
        raise DatabaseError(f"Error retrieving unified examinations: {e}")