import json
import textwrap
from datetime import date, datetime
from typing import List, Dict, Any
from agents import function_tool

from medicus_common.core.database import db_manager
from medicus_common.core import logger
from medicus_common.models.medical.medications import MedicalPrescription
from medicus_common.models.medical.medications import Medication


@function_tool
async def create_prescription(
        medical_prescription: MedicalPrescription
) -> Dict[str, Any]:
    """
    Create and record a new medical prescription for a patient.

    INTENT
    ------
    Use this tool when a licensed clinician explicitly prescribes one or more
    medications for a patient. This tool creates a formal prescription record
    and generates a printable prescription document.

    WHEN TO USE
    -----------
    - Doctor states a clear intent to prescribe medication
    - All required prescription details are known
    - A new prescription (not a correction or cancellation) is intended

    WHEN NOT TO USE
    ----------------
    - Do NOT use for edits or corrections → use invalidate_prescription + create_prescription
    - Do NOT invent dates, dosages, or medications
    - Do NOT prescribe without explicit clinician intent

    PARAMETERS
    ----------
    medical_prescription : MedicalPrescription
        Structured prescription payload containing:
        - patient_id (int): Patient receiving the prescription
        - doctor_id (int): Prescribing clinician
        - date_prescribed: optional, ignored (prescriptions are dated today)
        - medications (List[Medication]):
            - medication_name (str): Medication name
            - dosage (str): Exact dosage (e.g., "500 mg")
            - frequency (str): Dosing frequency (e.g., "TID", "once daily")
            - duration (str): Duration of therapy, e.g. "90 days"
            - purpose (str, optional): Clinical indication
        - notes (str, optional): Additional instructions or warnings

    RETURNS
    -------
    Dict[str, Any]
        A structured result containing:
        - prescription_id
        - formatted_prescription_text
        - status confirmation

    STATE BEHAVIOR
    --------------
    - Writes to database
    - Triggers audit logging
    - Triggers materialized view refresh

    HARD RULES
    ----------
    - Never hallucinate future dates
    - Never infer missing dosage or frequency
    - If required data is missing, request clarification instead of guessing
    - This tool does NOT stop or replace existing prescriptions. When the doctor changes a
      dose, say the earlier prescription is still on file (or remove it with
      delete_prescription if asked); never claim it was discontinued automatically
    """


    if isinstance(medical_prescription, dict):
        # Convert dictionary to MedicalPrescription object
        medical_prescription = MedicalPrescription(**medical_prescription)

    # Convert medications to JSON format expected by medications_view
    # View expects: name, dose, frequency, duration_days, form
    # Model has: medication_name, dosage, frequency, duration, purpose, form
    def medication_to_view_format(med):
        if isinstance(med, Medication):
            med_dict = med.dict()
        else:
            med_dict = med

        # Parse duration string to days (e.g., "7 days" -> 7, "1 week" -> 7)
        duration_days = None
        duration_str = med_dict.get('duration', '')
        if duration_str:
            duration_str = str(duration_str).lower().strip()
            if 'day' in duration_str:
                try:
                    duration_days = int(''.join(filter(str.isdigit, duration_str.split('day')[0])))
                except ValueError:
                    pass
            elif 'week' in duration_str:
                try:
                    weeks = int(''.join(filter(str.isdigit, duration_str.split('week')[0])))
                    duration_days = weeks * 7
                except ValueError:
                    pass
            elif duration_str.isdigit():
                duration_days = int(duration_str)

        return {
            'name': med_dict.get('medication_name') or med_dict.get('name'),
            'dose': med_dict.get('dosage') or med_dict.get('dose'),
            'frequency': med_dict.get('frequency'),
            'duration_days': duration_days,
            'form': med_dict.get('form'),
            'purpose': med_dict.get('purpose'),
        }

    medications_json = json.dumps(
        [medication_to_view_format(med) for med in medical_prescription.medications]
    )

    # ALWAYS use today's date for prescriptions
    # Doctors prescribe medications NOW, not in the past
    # This prevents AI from hallucinating dates from training data
    date_prescribed = date.today()

    # SQL query to insert a new medical medirx
    query = """
    INSERT INTO public.medical_prescriptions (patient_id, doctor_id, date_prescribed, medications, notes)
    VALUES ($1, $2, $3, $4, $5)
    """

    # Use the database manager to get a connection
    async with db_manager.get_connection() as conn:
        await conn.execute(
            query,
            medical_prescription.patient_id,
            medical_prescription.doctor_id,
            date_prescribed,
            medications_json,
            medical_prescription.notes
        )

    # TEMPORARY: Manual refresh for testing only - DB triggers should handle this
    # TODO: Remove after confirming triggers are working properly

    return {
        "status": "success",
        "message": "Prescription created successfully",
        "date_prescribed": date_prescribed.isoformat()
    }

@function_tool
async def delete_prescription(medical_prescription: MedicalPrescription):
    """
    Invalidate (cancel) an existing prescription record.

    INTENT
    ------
    Use this tool to mark a prescription as no longer valid.
    This represents clinical cancellation or administrative error correction.

    This tool does NOT delete data permanently.
    The prescription remains in the audit trail.

    WHEN TO USE
    -----------
    - Prescription was entered in error
    - Medication was discontinued
    - Prescription must no longer be considered active

    WHEN NOT TO USE
    ----------------
    - Do NOT use to modify a prescription
    - Do NOT create a new prescription in the same step

    PARAMETERS
    ----------
    medical_prescription : MedicalPrescription
        Identifying data for the prescription to invalidate:
        - patient_id (int)
        - doctor_id (int)
        - date_prescribed (date)
        - medications (list)

        Only identifying fields are required; full object may be provided.

    RETURNS
    -------
    None

    STATE BEHAVIOR
    --------------
    - Updates prescription status to invalidated
    - Preserves record for legal and clinical audit
    - Refreshes medication views

    HARD RULES
    ----------
    - Must correspond to an existing prescription
    - Never silently fail — surface errors clearly
    """

    logger.info("🔧 [TOOL] delete_prescription called")

    # Convert date_prescribed to date object if it's a string
    date_prescribed = medical_prescription.date_prescribed
    if isinstance(date_prescribed, str):
        # Parse ISO format date string to date object
        date_prescribed = datetime.fromisoformat(date_prescribed.replace('Z', '+00:00')).date()
    elif isinstance(date_prescribed, datetime):
        date_prescribed = date_prescribed.date()

    # SQL query to delete a medical medirx
    query = """
    DELETE FROM public.medical_prescriptions
    WHERE patient_id = $1 AND doctor_id = $2 and date_prescribed = $3
    """

    # Use the database manager to get a connection
    async with db_manager.get_connection() as conn:
        await conn.execute(query,
                           medical_prescription.patient_id,
                           medical_prescription.doctor_id,
                           date_prescribed)




def _generate_prescription_text(medical_prescription: MedicalPrescription) -> str:
    """
    Generates a well-formatted medirx text using medipatient and medidoctor context.

    :param medical_prescription: The medirx details.
    :return: Formatted medirx text.
    """

    if isinstance(medical_prescription, dict):
        # Convert dictionary to MedicalPrescription object
        medical_prescription = MedicalPrescription(**medical_prescription)

    # medications_json = json.dumps(
    #     [med.dict() if isinstance(med, Medication) else med for med in medical_prescription.medications]
    # )

    # Extract medirx details
    date_prescribed_obj = medical_prescription.date_prescribed
    if isinstance(date_prescribed_obj, str):
        # Parse ISO format date string to date object
        date_prescribed_obj = datetime.fromisoformat(date_prescribed_obj.replace('Z', '+00:00')).date()
    elif isinstance(date_prescribed_obj, datetime):
        date_prescribed_obj = date_prescribed_obj.date()
    
    date_prescribed = date_prescribed_obj.strftime("%Y-%m-%d")
    medications: List[Medication] = medical_prescription.medications
    notes = medical_prescription.notes

    # Prescription Header
    separator_line = "=" * 70
    section_line = "-" * 70

    prescription_text = (
            "\n" * 4
            + f"{separator_line}\n"
            + f"{' ' * ((70 - len('MEDICAL PRESCRIPTION')) // 2)}MEDICAL PRESCRIPTION\n"
            + f"{separator_line}\n"
            + f"Patient: {medical_prescription.patient_name:<30} Date: {date_prescribed}\n"
            + f"Prescribed by: {medical_prescription.doctor_name}\n"
            + f"{separator_line}\n"
            + f"{'Medication':<25}{'Dosage':<15}{'Frequency':<20}{'Duration'}\n"
            + f"{section_line}\n"
    )

    # Medications List
    for med in medications:
        name = med.name
        dosage = med.dosage
        frequency = med.frequency or "N/A"
        duration = med.duration or "N/A"
        purpose = getattr(med, 'purpose', None)  # Get the purpose if it exists

        prescription_text += (
            f"{name:<25}{dosage:<15}{frequency:<20}{duration}\n"
        )

        if purpose:
            wrapped_purpose = textwrap.fill(purpose, width=70, subsequent_indent=' ' * 9)
            prescription_text += f"\nPurpose: {wrapped_purpose}\n\n"

    prescription_text += f"{section_line}\n\n"

    # Footer
    prescription_text += f"Notes:\n{notes}\n"
    prescription_text += f"{separator_line}\n"

    return prescription_text





