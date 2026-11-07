"""MediSolo: the patient's assistant when no doctor is in the conversation."""

from pathlib import Path

from src.assistants.common.factory import build_assistant
from src.tools.medibooking.visits import get_medical_visits
from src.tools.mediclinic.conditions import get_medical_conditions
from src.tools.mediclinic.procedures import get_medical_procedures
from src.tools.mediclinic.vitals import get_medical_vitals
from src.tools.mediexam.examinations import get_medical_examinations
from src.tools.medipatient.patient_details import get_patient_profile_details
from src.tools.medirx.medications import get_medications
from src.tools.medisupport.user_support import close_support, get_support, report_support
from src.tools.meditriage.alerts import trigger_emergency_protocol

TOOLS = [
    trigger_emergency_protocol, get_support, report_support, close_support,
    get_medical_vitals, get_medical_visits, get_medical_conditions,
    get_medical_examinations, get_medical_procedures,
    get_patient_profile_details,
    get_medications,
]

medisolo = build_assistant("MediAid", Path(__file__).resolve().parent, "medisolo_instructions.md", TOOLS)
