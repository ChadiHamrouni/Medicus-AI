"""MediAid: the patient's assistant inside a patient <-> doctor conversation."""

from pathlib import Path

from src.assistants.common.factory import build_assistant
from src.tools.medibooking.booking import create_booking, delete_booking, update_booking
from src.tools.medibooking.free_slots import find_free_slots
from src.tools.medibooking.visits import get_medical_visits
from src.tools.mediclinic.conditions import get_medical_conditions
from src.tools.mediclinic.procedures import get_medical_procedures
from src.tools.mediclinic.vitals import get_medical_vitals
from src.tools.medidoctor.doctor_details import get_doctor_profile_details
from src.tools.mediexam.examinations import get_medical_examinations
from src.tools.mediexplain.summarize import mediexplain_explain
from src.tools.medipatient.patient_details import get_patient_profile_details
from src.tools.medirx.medications import get_medications
from src.tools.medishow.doctor_profile import show_doctor_page
from src.tools.medisupport.user_support import close_support, get_support, report_support
from src.tools.meditriage.alerts import trigger_emergency_protocol

TOOLS = [
    trigger_emergency_protocol, get_support, report_support, close_support,
    get_medical_visits, find_free_slots, create_booking, update_booking, delete_booking,
    get_medical_vitals, get_medical_conditions, get_medical_examinations, get_medical_procedures,
    get_doctor_profile_details,
    mediexplain_explain,
    get_patient_profile_details,
    get_medications,
    show_doctor_page,
]

mediaid = build_assistant("MediAid", Path(__file__).resolve().parent, "mediaid_instructions.md", TOOLS)
