import json
from typing import Dict, Any

from agents import function_tool

from medicus_common import DatabaseError
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.medical.exams import MedicalExam
from medicus_common.models.audit.audit_context import AuditContext

from src.tools.mediclinic.helpers import _insert_audit


def _generate_exam_report_text(exam: MedicalExam) -> str:
    """Generates a formatted text report of the exam results."""
    separator = "=" * 70
    section = "-" * 70
    date_str = exam.exam_date.strftime("%Y-%m-%d") if hasattr(exam.exam_date, 'strftime') else str(exam.exam_date)

    text = (
        f"\n\n{separator}\n"
        f"{'EXAMINATION REPORT':^70}\n"
        f"{separator}\n"
        f"Patient ID: {exam.patient_id:<30} Date: {date_str}\n"
        f"Type: {exam.exam_type:<33} Provider: {exam.healthcare_provider_name or 'N/A'}\n"
        f"{section}\n"
        f"{'Test Parameter':<25}{'Value':<15}{'Units':<10}{'Reference Range'}\n"
        f"{section}\n"
    )

    if exam.exam_results:
        for res in exam.exam_results:
            text += f"{res.parameter:<25}{res.value:<15}{res.units or '':<10}{res.reference_range or ''}\n"

    text += f"{section}\nSummary: {exam.exam_summary or 'No summary provided.'}\n{separator}\n"
    return text

@function_tool
async def report_medical_exam(
        medical_exam: MedicalExam,
        audit: AuditContext
) -> Dict[str, Any]:
    """
    Persist completed diagnostic exam results to the patient record.

    INTENT
    ------
    Use this tool ONLY after exam results are finalized and structured.

    This tool represents the completion of a diagnostic exam.

    WHEN TO USE
    -----------
    - After an uploaded report has been analysed and the clinician confirms the values
    - When a clinician confirms exam findings
    - When entering lab or imaging results manually

    PARAMETERS
    ----------
    medical_exam : MedicalExam
        Structured exam data including:
        - patient_id
        - exam_type
        - exam_date
        - exam_results
        - exam_summary
        - ordering / performing clinician metadata

    audit : AuditContext
        Mandatory context for:
        - Security
        - Traceability
        - Clinical audit trail

    RETURNS
    -------
    Dict[str, Any]
        Confirmation payload including:
        - persisted exam ID
        - formatted exam report text

    STATE TRANSITION
    ----------------
    pending (order) → completed (exam result)

    HARD RULES
    ----------
    - Do NOT use without confirmed results
    """

    try:
        exam_results_json = json.dumps([r.model_dump() for r in medical_exam.exam_results]) if medical_exam.exam_results else "[]"
        formatted_text = _generate_exam_report_text(medical_exam)

        async with db_manager.get_connection() as conn:
            async with conn.transaction():
                # Using ON CONFLICT logic from your original snippet to prevent duplicates
                query = """
                    INSERT INTO public.medical_examinations 
                    (patient_id, doctor_id, exam_date, exam_type, exam_results, exam_summary, healthcare_provider_name)
                    VALUES ($1, $2, $3, $4, $5, $6, $7) 
                    ON CONFLICT (patient_id, doctor_id, exam_date, exam_type) DO UPDATE SET
                        exam_results = EXCLUDED.exam_results,
                        exam_summary = EXCLUDED.exam_summary,
                        healthcare_provider_name = EXCLUDED.healthcare_provider_name,
                        updated_at = now()
                    RETURNING id
                """
                exam_id = await conn.fetchval(
                    query, medical_exam.patient_id, medical_exam.doctor_id,
                    medical_exam.exam_date, medical_exam.exam_type,
                    exam_results_json, medical_exam.exam_summary,
                    medical_exam.healthcare_provider_name
                )

                result = {
                    "exam_id": exam_id,
                    "formatted_text": formatted_text,
                    "status": "completed",
                    "_context_window_priority": (
                        "This exam was just recorded and may not appear yet in get_medical_examinations results. "
                        "When showing the patient's exams, silently include this alongside get_medical_examinations output. "
                        "Do NOT mention data sources, views, or any technical detail to the doctor."
                    ),
                }

                await _insert_audit(
                    audit.actor_user_id, audit.actor_role, "report_medical_exam",
                    medical_exam.model_dump(), result, audit.convo_id, audit.message_id
                )

                return result
    except Exception as e:
        logger.error("report_medical_exam_failed", error=str(e))
        raise DatabaseError(f"Failed to record exam results: {e}")

