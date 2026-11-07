
from agents import function_tool

from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.medical.exams import MedicalExam, MedicalExamOrder

@function_tool
async def order_medical_exam(exam: MedicalExamOrder):
    """
    Create a new diagnostic exam order for a patient.

    INTENT
    ------
    Use this tool when a clinician decides that a diagnostic exam
    (lab or imaging) should be performed in the future.

    This represents an ORDER, not a result.

    WHEN TO USE
    -----------
    - "Order a CBC"
    - "Schedule an MRI of the brain"
    - "Send the patient for blood work"

    WHEN NOT TO USE
    ----------------
    - Do NOT use for completed exam results
    - Do NOT use to upload or extract exam files
    - Do NOT check for duplicates (this tool always inserts)

    PARAMETERS
    ----------
    exam : MedicalExamOrder
        Required fields:
        - patient_id (int): Patient identifier
        - doctor_id (int): Ordering clinician
        - ordered_exam (str): Exam name (e.g., "CBC", "Chest MRI")
        - exam_type (str): One of: lab_test, CT_scan, MRI, ultrasound, X-ray

        Optional fields:
        - healthcare_provider_name (str): Facility performing the exam

    RETURNS
    -------
    None
        Persists a new pending exam order.

    STATE TRANSITION
    ----------------
    pending → (later) completed via report_medical_exam

    HARD RULES
    ----------
    - This tool ALWAYS creates a new order
    - Do NOT attempt deduplication
    - Must be called by MediDoc (doctor-facing context)
    """

    logger.info("🔧 [TOOL] order_medical_exam called")

    if isinstance(exam, dict):
        exam = MedicalExamOrder(**exam)

    query = """
    INSERT INTO public.medical_exam_orders (
        patient_id, doctor_id, ordered_exam, exam_type, healthcare_provider_name
    )
    VALUES ($1, $2, $3, $4, $5)
    """
    async with db_manager.get_connection() as conn:
        await conn.execute(
            query,
            exam.patient_id,
            exam.doctor_id,
            exam.ordered_exam,
            exam.exam_type,
            exam.healthcare_provider_name
        )
        logger.debug(f"✅ Exam order created successfully for patient {exam.patient_id}")


async def _generate_reported_exam_text(exam: MedicalExam) -> str:
    """
    Generate a well-formatted medical exam report text with test results and summary.
    """
    if isinstance(exam, dict):
        exam = MedicalExam(**exam)

    exam_date_str = exam.exam_date.strftime("%Y-%m-%d")
    results = exam.exam_results or []
    summary = exam.exam_summary or ""
    provider = exam.healthcare_provider_name or "N/A"

    separator = "=" * 70
    section_sep = "-" * 120
    header_space = "\n" * 2  # space for pre-printed header

    text = (
            header_space +
        f"{separator}\n" +
        f"{'MEDICAL EXAMINATION REPORT':^70}\n" +
        f"{separator}\n" +
        f"Patient: {exam.patient_name:<30} Date: {exam_date_str}\n" +
        f"Ordered by: {exam.doctor_name:<30} Provided by: {provider}\n" +
        f"{separator}\n"
        f"{'Test':<25}{'Value':<15}{'Units':<10}{'Reference Range':<25}Comments\n" +
            f"{section_sep}\n"
    )

    if not results:
        text += "No test results available.\n"
    else:
        for res in results:
            param = getattr(res, "parameter", getattr(res, "test", "N/A"))
            value = getattr(res, "value", "N/A")
            units = getattr(res, "units", getattr(res, "units", ""))
            ref_range = getattr(res, "reference_range", "")
            comments = getattr(res, "comments", "")
            text += f"{param:<25}{value:<15}{units:<10}{ref_range:<25}{comments}\n"

    text += f"{section_sep}\n"
    text += f"Report Summary:\n{summary}\n"
    text += f"{separator}\n"
    return text


async def _generate_ordered_exam_text(exam: MedicalExam) -> str:
    """
    Generate a well-formatted medical exam order text.
    """
    if isinstance(exam, dict):
        exam = MedicalExam(**exam)

    exam_date_str = exam.exam_date.strftime("%Y-%m-%d")
    provider = exam.healthcare_provider_name or "N/A"

    separator = "=" * 70
    header_space = "\n" * 4  # space for pre-printed header

    text = (
            header_space +
        f"{separator}\n" +
        f"{'MEDICAL EXAM ORDER':^70}\n" +
        f"{separator}\n" +
        f"Patient: {exam.patient_name:<30} Date: {exam_date_str}\n" +
        f"Ordered by: {exam.doctor_name}\n" +
        f"Provided by: {provider}\n" +
        f"{separator}\n"
        f"Exam Type: {exam.exam_type}\n" +
        f"Ordered Exam: {exam.ordered_exam}\n" +
        f"{separator}\n"
    )
    return text





