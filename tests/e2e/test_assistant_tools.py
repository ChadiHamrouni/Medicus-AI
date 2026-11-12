"""Every assistant tool, called against the demo database without an LLM.

The calls run inside the ai container (container/tool_runner.py), with the same identity
the agent runtime gives each conversation type. Writes pass spoofed ids (999) on purpose:
the tools must ignore them and act for the conversation's own patient and doctor.
The cases run in order in one batch; later ones use records the earlier ones create.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest

pytestmark = pytest.mark.container

RUNNER = Path(__file__).parent / "container" / "tool_runner.py"


def _next_weekday(weekday: int, weeks: int = 2) -> date:
    d = date.today() + timedelta(weeks=weeks)
    return d + timedelta(days=(weekday - d.weekday()) % 7)


MON, TUE = _next_weekday(0), _next_weekday(1)
TODAY = date.today().isoformat()
IN_30_DAYS = (date.today() + timedelta(days=30)).isoformat()
SLOT = datetime.combine(MON, datetime.min.time(), tzinfo=timezone.utc).replace(hour=11)
VISIT = {"doctor_id": "$did", "patient_id": 999, "start_time": SLOT.isoformat(),
         "end_time": (SLOT + timedelta(minutes=30)).isoformat(), "visit_type": "consultation",
         "visit_details": "e2e"}
MOVED_VISIT = dict(VISIT, visit_details="e2e: bring lab results", end_time=(SLOT + timedelta(minutes=45)).isoformat())
FREE_SLOTS = {"doctor_id": "$did", "start_date": MON.isoformat(), "end_date": TUE.isoformat(), "duration": 30}
METFORMIN = {"medication_name": "Metformin", "dosage": "500 mg"}


def patient_reads(thread: str) -> list[tuple]:
    return [
        (thread, "get_patient_profile_details", {}),
        (thread, "get_medical_vitals", {}),
        (thread, "get_medical_conditions", {"active_only": True}),
        (thread, "get_medications", {"active_only": True}),
        (thread, "get_medical_examinations", {"time_range": None, "pending_only": False}),
        (thread, "get_medical_procedures", {"upcoming_only": False, "limit": 10, "offset": 0}),
        (thread, "get_medical_visits", {"time_range": None, "upcoming_only": True}),
        (thread, "get_support", {"status": None, "category": None, "limit": 5}),
    ]


# (conversation type, tool, arguments[, label to tell repeated calls apart])
CASES: list[tuple] = [
    *patient_reads("patient_doctor"),
    *patient_reads("patient_solo"),
    ("patient_doctor", "get_doctor_profile_details", {"doctor_id": "$did"}),
    ("patient_doctor", "find_free_slots", FREE_SLOTS),
    ("patient_doctor", "show_doctor_page", {}),

    ("doctor_patient", "get_patient_profile_details", {}),
    ("doctor_patient", "get_medical_vitals", {}),
    ("doctor_patient", "get_medical_conditions", {"active_only": False}),
    ("doctor_patient", "get_medications", {"active_only": False}),
    ("doctor_patient", "get_medical_notes", {"limit": 10, "offset": 0}),
    ("doctor_patient", "get_medical_events", {"event_types": None, "status": None, "limit": 10}),
    ("doctor_patient", "get_medical_examinations", {"time_range": None, "pending_only": False}),
    ("doctor_patient", "get_medical_procedures", {"upcoming_only": False, "limit": 10, "offset": 0}),
    ("doctor_patient", "get_medical_visits", {"time_range": None, "upcoming_only": False}),
    ("doctor_patient", "get_doctor_agenda", {"start_date": TODAY, "end_date": IN_30_DAYS, "upcoming_only": True}),
    ("doctor_patient", "get_doctor_profile_details", {"doctor_id": "$did"}),
    ("doctor_patient", "show_patient_page", {}),
    ("doctor_patient", "get_patient_engagement_metrics", {}),

    ("doctor_solo", "get_doctor_agenda", {"start_date": None, "end_date": None, "upcoming_only": True}),
    ("doctor_solo", "get_doctor_performance_metrics", {}),
    ("doctor_solo", "search_conversations", {"query": "Sam", "assistant": "medidoc"}),
    ("doctor_solo", "find_free_slots", FREE_SLOTS),

    # charting by the doctor
    ("doctor_patient", "report_medical_vitals", {"medical_data": {"vital_values": [
        {"vital_text": "systolic", "vital_value": "131"}, {"vital_text": "diastolic", "vital_value": "86"},
        {"vital_text": "heart rate", "vital_value": "70"}, {"vital_text": "temperature", "vital_value": "37.1"}]}}),
    ("doctor_patient", "report_medical_condition", {"medical_data": {
        "condition_id": None, "condition_text": "Type 2 diabetes mellitus", "diagnosis_date": TODAY,
        "severity": "moderate", "notes": "HbA1c 7.4%", "resolved_date": None, "is_active": True}}),
    ("doctor_patient", "report_medical_note", {"medical_data": {"note_date": TODAY, "note_details": {
        "summary": "BP follow-up",
        "subjective": {"chief_complaint": "Headaches", "hpi": None, "ros": None, "medical_history": None,
                       "family_history": None, "social_history": None, "medications": None, "allergies": None,
                       "patient_quotes": None},
        "objective": None,
        "assessment": {"diagnosis": "Hypertension", "differential_diagnosis": None, "progress": "stable",
                       "summary": None},
        "plan": None}}}),
    ("doctor_patient", "supersede_medical_note", {"data": {
        "original_id": "$latest_note", "patient_id": 999, "doctor_id": 999, "note_date": TODAY,
        "note_details": {"summary": "BP follow-up (corrected)"}}}),
    ("doctor_patient", "invalidate_medical_note", {"data": {"id": "$latest_note", "reason": "entered for wrong visit"}}),
    ("doctor_patient", "create_prescription", {"medical_prescription": {
        "patient_id": 999, "patient_name": "x", "doctor_id": 999, "doctor_name": "x", "date_prescribed": TODAY,
        "medications": [dict(METFORMIN, frequency="twice daily", duration="90 days", purpose="diabetes",
                             form="tablet")], "notes": None}}),
    ("doctor_patient", "order_medical_exam", {"exam": {
        "patient_id": 999, "doctor_id": 999, "ordered_exam": "HbA1c", "exam_type": "lab",
        "healthcare_provider_name": None}}),
    ("doctor_patient", "report_medical_exam", {"medical_exam": {
        "patient_id": 999, "patient_name": "x", "doctor_id": None, "doctor_name": None, "exam_date": TODAY,
        "ordered_exam": "HbA1c", "exam_type": "lab", "healthcare_provider_name": None,
        "exam_results": [{"parameter": "HbA1c", "test": "HbA1c", "value": "7.4", "units": "%",
                          "reference_range": "4.0-5.6", "comments": None}],
        "exam_summary": "Elevated"}}),
    ("doctor_patient", "schedule_medical_procedure", {"data": {
        "doctor_id": 999, "procedure_text": "Echocardiogram", "scheduled_date": TUE.isoformat(),
        "scheduled_time": "14:00", "healthcare_provider_text": None, "location": None}}),
    ("doctor_patient", "report_medical_procedure_detail", {
        "procedure_id": "$latest_procedure", "actor_role": "doctor", "entry_type": "observation",
        "events": [{"event_text": "LVEF", "event_value": "60", "event_unit": "%"}], "severity_level": 1}),
    ("doctor_patient", "finalize_medical_procedure", {
        "procedure_id": "$latest_procedure", "final_status": "completed", "outcome_notes": "Normal"}),
    ("doctor_patient", "delete_prescription", {"medical_prescription": {
        "patient_id": 999, "patient_name": "x", "doctor_id": 999, "doctor_name": "x", "date_prescribed": TODAY,
        "medications": [dict(METFORMIN, frequency=None, duration=None, purpose=None, form=None)], "notes": None}}),
    ("doctor_patient", "get_medications", {"active_only": True}, "after-delete"),
    ("doctor_patient", "medibrief_summarize", {}),

    # booking lifecycle, patient side
    ("patient_doctor", "create_booking", {"medical_visit": VISIT}),
    ("patient_doctor", "create_booking", {"medical_visit": VISIT}, "double-book"),
    ("patient_doctor", "update_booking", {"medical_visit": MOVED_VISIT}),
    ("patient_doctor", "delete_booking", {"medical_visit": MOVED_VISIT}),

    # support tickets
    ("patient_doctor", "report_support", {"subject": "App crash", "description": "Crashes on upload",
                                          "category": "technical", "priority": "medium", "tags": None}),
    ("patient_doctor", "close_support", {"ticket_id": "$latest_ticket", "resolution_note": "fixed"}),
]


def case_id(case: tuple) -> str:
    return "-".join([case[0], case[1], *case[3:]])


def looks_failed(output: str) -> bool:
    low = output.lower()
    return ("an error occurred while running the tool" in low or "traceback" in low
            or '"success": false' in low or "'success': false" in low or '"error"' in low[:200])


@pytest.fixture(scope="module")
def tool_run(ai_container):
    payload = [{"id": case_id(c), "thread": c[0], "tool": c[1], "args": c[2]} for c in CASES]
    return ai_container.python_json(RUNNER, payload)


def _output(tool_run, case) -> str:
    result = tool_run["results"][case_id(case)]
    assert "error" not in result, result["error"]
    return result["output"]


ORDINARY = [c for c in CASES if case_id(c) != "patient_doctor-create_booking-double-book"]


@pytest.mark.parametrize("case", ORDINARY, ids=[case_id(c) for c in ORDINARY])
def test_tool_call_succeeds(tool_run, case):
    output = _output(tool_run, case)
    assert not looks_failed(output), output[:400]


def test_double_booking_is_refused(tool_run):
    case = next(c for c in CASES if case_id(c) == "patient_doctor-create_booking-double-book")
    assert "no longer available" in _output(tool_run, case).lower()


def test_deleted_prescription_is_no_longer_active(tool_run):
    case = next(c for c in CASES if case_id(c) == "doctor_patient-get_medications-after-delete")
    assert "metformin" not in _output(tool_run, case).lower()


def test_spoofed_ids_in_tool_arguments_are_ignored(tool_run):
    assert tool_run["spoofed_rows"] == 0, "a write tool stored the patient or doctor id the model sent"
