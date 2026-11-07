"""MediDoc: the doctor's assistant inside a doctor <-> patient conversation."""

from pathlib import Path

from src.assistants.common.factory import build_assistant
from src.tools.medibooking.booking import create_booking, delete_booking, update_booking
from src.tools.medibooking.doctor_agenda import get_doctor_agenda
from src.tools.medibooking.free_slots import find_free_slots
from src.tools.medibooking.visits import get_medical_visits
from src.tools.medibrief.summarize import medibrief_summarize
from src.tools.mediclinic.conditions import get_medical_conditions, report_medical_condition
from src.tools.mediclinic.events import get_medical_events
from src.tools.mediclinic.notes import (
    get_medical_notes,
    invalidate_medical_note,
    report_medical_note,
    supersede_medical_note,
)
from src.tools.mediclinic.procedures import (
    finalize_medical_procedure,
    get_medical_procedures,
    report_medical_procedure_detail,
    schedule_medical_procedure,
    supersede_medical_procedure,
)
from src.tools.mediclinic.vitals import get_medical_vitals, report_medical_vitals
from src.tools.medidoctor.doctor_details import get_doctor_profile_details
from src.tools.mediexam.examinations import get_medical_examinations
from src.tools.mediexam.orders import order_medical_exam
from src.tools.mediexam.reports import report_medical_exam
from src.tools.medipatient.patient_details import get_patient_profile_details
from src.tools.medirx.medications import get_medications
from src.tools.medirx.prescription import create_prescription, delete_prescription
from src.tools.mediinsight.patient_analytics import get_patient_engagement_metrics
from src.tools.medishow.patient_profile import show_patient_page
from src.tools.medisupport.user_support import close_support, get_support, report_support
from src.tools.meditriage.alerts import trigger_emergency_protocol

TOOLS = [
    # triage & support
    trigger_emergency_protocol, get_support, report_support, close_support,
    # scheduling
    get_medical_visits, find_free_slots, create_booking, update_booking, delete_booking, get_doctor_agenda,
    # summaries
    medibrief_summarize,
    # clinical record
    get_medical_conditions, report_medical_condition, get_medical_events,
    get_medical_notes, report_medical_note, supersede_medical_note, invalidate_medical_note,
    get_medical_procedures, schedule_medical_procedure, report_medical_procedure_detail,
    finalize_medical_procedure, supersede_medical_procedure,
    get_medical_vitals, report_medical_vitals,
    # profiles
    get_doctor_profile_details, get_patient_profile_details, get_patient_engagement_metrics, show_patient_page,
    # exams & prescriptions
    get_medical_examinations, order_medical_exam, report_medical_exam,
    get_medications, create_prescription, delete_prescription,
]

medidoc = build_assistant("MediDoc", Path(__file__).resolve().parent, "medidoc_instructions.md", TOOLS)
