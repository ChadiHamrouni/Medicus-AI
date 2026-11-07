"""DocSolo: the doctor's assistant outside any patient conversation (agenda, analytics, search)."""

from pathlib import Path

from src.assistants.common.factory import build_assistant
from src.tools.medibooking.doctor_agenda import get_doctor_agenda
from src.tools.medibooking.free_slots import find_free_slots
from src.tools.mediconvo.search import search_conversations
from src.tools.medidoctor.doctor_details import get_doctor_profile_details
from src.tools.mediinsight.doctor_analytics import get_doctor_performance_metrics
from src.tools.medisupport.user_support import close_support, get_support, report_support
from src.tools.meditriage.alerts import trigger_emergency_protocol

TOOLS = [
    trigger_emergency_protocol, get_support, report_support, close_support,
    get_doctor_agenda, find_free_slots,
    search_conversations,
    get_doctor_profile_details,
    get_doctor_performance_metrics,
]

docsolo = build_assistant("MediDoc", Path(__file__).resolve().parent, "docsolo_instructions.md", TOOLS)
