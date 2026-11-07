"""Run every assistant tool against the demo database, as the agent runtime would.

Executed inside the ai container (no LLM needed):
    docker compose exec -T ai python - < tests/e2e/tool_harness.py
"""
import asyncio
import json
import sys
from datetime import date, datetime, timedelta, timezone
from agents.tool_context import ToolContext

from medicus_common.core.database import db_manager
from src.assistants.docsolo.docsolo_agent import docsolo
from src.assistants.medidoc.medidoc_agent import medidoc
from src.assistants.mediaid.mediaid_agent import mediaid
from src.assistants.medisolo.medisolo_agent import medisolo
from src.security.tool_guard import build_tool_context

ONLY = set(sys.argv[1:])
results = []


def next_weekday(weekday: int, weeks: int = 2) -> date:
    d = date.today() + timedelta(weeks=weeks)
    return d + timedelta(days=(weekday - d.weekday()) % 7)


MON = next_weekday(0)
TUE = next_weekday(1)
TODAY = date.today().isoformat()


async def run(agent, ctx, name, args, label=""):
    if ONLY and name not in ONLY:
        return None
    tool = next((t for t in agent.tools if t.name == name), None)
    if tool is None:
        results.append((False, agent.name, ctx["_tag"], name, "TOOL NOT FOUND"))
        return None
    try:
        out = await tool.on_invoke_tool(ToolContext(context=ctx["ctx"], tool_name=name, tool_call_id="t", tool_arguments=json.dumps(args)), json.dumps(args))
    except Exception as e:  # noqa: BLE001
        results.append((False, agent.name, ctx["_tag"], name, f"EXCEPTION {type(e).__name__}: {e}"))
        return None
    text = out if isinstance(out, str) else json.dumps(out.model_dump() if hasattr(out, "model_dump") else out, default=str)
    low = text.lower()
    bad = ("an error occurred while running the tool" in low or "traceback" in low
           or '"success": false' in low or "'success': false" in low or '"error"' in low[:200])
    results.append((not bad, agent.name, ctx["_tag"], name + label, text[:260].replace("\n", " ")))
    return text


def scope(tag, user_id, role, assistant, convo, patient_id, doctor_id):
    return {"_tag": tag, "ctx": build_tool_context(
        user_id=user_id, actor_role=role, assistant=assistant, conversation_id=str(convo),
        mirror_conversation_id=None, patient_id=patient_id, doctor_id=doctor_id)}


async def main():
    await db_manager.initialize()
    rows = await db_manager.fetch("SELECT id, user_id, patient_id, doctor_id, assistant::text a FROM dialog.conversations")
    pat_user = await db_manager.fetchval("SELECT id FROM auth.users WHERE email='patient@example.com'")
    doc_user = await db_manager.fetchval("SELECT id FROM auth.users WHERE email='doctor@example.com'")
    pid = await db_manager.fetchval("SELECT id FROM public.patients WHERE user_id=$1 AND relationship='main'", pat_user)
    did = await db_manager.fetchval("SELECT id FROM public.doctors WHERE user_id=$1", doc_user)
    conv = {(r["user_id"], r["a"], r["patient_id"] is not None, r["doctor_id"] is not None): r["id"] for r in rows}
    p_pair = scope("patient+doctor", pat_user, "patient", "mediaid", conv[(pat_user, "mediaid", True, True)], pid, did)
    p_solo = scope("patient solo", pat_user, "patient", "mediaid", conv[(pat_user, "mediaid", True, False)], pid, None)
    d_pair = scope("doctor+patient", doc_user, "doctor", "medidoc", conv[(doc_user, "medidoc", True, True)], pid, did)
    d_solo = scope("doctor solo", doc_user, "doctor", "medidoc", conv[(doc_user, "medidoc", False, True)], None, did)

    # ---------------- reads: patient side
    for ag, sc in ((mediaid, p_pair), (medisolo, p_solo)):
        await run(ag, sc, "get_patient_profile_details", {})
        await run(ag, sc, "get_medical_vitals", {})
        await run(ag, sc, "get_medical_conditions", {"active_only": True})
        await run(ag, sc, "get_medications", {"active_only": True})
        await run(ag, sc, "get_medical_examinations", {"time_range": None, "pending_only": False})
        await run(ag, sc, "get_medical_procedures", {"upcoming_only": False, "limit": 10, "offset": 0})
        await run(ag, sc, "get_medical_visits", {"time_range": None, "upcoming_only": True})
        await run(ag, sc, "get_support", {"status": None, "category": None, "limit": 5})
    await run(mediaid, p_pair, "get_doctor_profile_details", {"doctor_id": did})
    await run(mediaid, p_pair, "find_free_slots", {"doctor_id": did, "start_date": MON.isoformat(), "end_date": TUE.isoformat(), "duration": 30})
    await run(mediaid, p_pair, "show_doctor_page", {})

    # ---------------- reads: doctor side
    for name, args in [
        ("get_patient_profile_details", {}), ("get_medical_vitals", {}), ("get_medical_conditions", {"active_only": False}),
        ("get_medications", {"active_only": False}), ("get_medical_notes", {"limit": 10, "offset": 0}),
        ("get_medical_events", {"event_types": None, "status": None, "limit": 10}),
        ("get_medical_examinations", {"time_range": None, "pending_only": False}),
        ("get_medical_procedures", {"upcoming_only": False, "limit": 10, "offset": 0}),
        ("get_medical_visits", {"time_range": None, "upcoming_only": False}),
        ("get_doctor_agenda", {"start_date": TODAY, "end_date": (date.today() + timedelta(days=30)).isoformat(), "upcoming_only": True}),
        ("get_doctor_profile_details", {"doctor_id": did}), ("show_patient_page", {}), ("get_patient_engagement_metrics", {}),
    ]:
        await run(medidoc, d_pair, name, args)
    for name, args in [
        ("get_doctor_agenda", {"start_date": None, "end_date": None, "upcoming_only": True}),
        ("get_doctor_performance_metrics", {}),
        ("search_conversations", {"query": "Sam", "assistant": "medidoc"}),
        ("find_free_slots", {"doctor_id": did, "start_date": MON.isoformat(), "end_date": TUE.isoformat(), "duration": 30}),
    ]:
        await run(docsolo, d_solo, name, args)

    # ---------------- writes: doctor charting
    await run(medidoc, d_pair, "report_medical_vitals", {"medical_data": {"vital_values": [
        {"vital_text": "systolic", "vital_value": "131"}, {"vital_text": "diastolic", "vital_value": "86"},
        {"vital_text": "heart rate", "vital_value": "70"}, {"vital_text": "temperature", "vital_value": "37.1"}]}})
    await run(medidoc, d_pair, "report_medical_condition", {"medical_data": {
        "condition_id": None, "condition_text": "Type 2 diabetes mellitus", "diagnosis_date": TODAY,
        "severity": "moderate", "notes": "HbA1c 7.4%", "resolved_date": None, "is_active": True}})
    note = await run(medidoc, d_pair, "report_medical_note", {"medical_data": {"note_date": TODAY, "note_details": {
        "summary": "BP follow-up", "subjective": {"chief_complaint": "Headaches", "hpi": None, "ros": None, "medical_history": None,
        "family_history": None, "social_history": None, "medications": None, "allergies": None, "patient_quotes": None},
        "objective": None, "assessment": {"diagnosis": "Hypertension", "differential_diagnosis": None, "progress": "stable", "summary": None},
        "plan": None}}})
    note_id = await db_manager.fetchval("SELECT max(id) FROM public.medical_notes WHERE patient_id=$1 AND status='active'", pid)
    if note_id:
        await run(medidoc, d_pair, "supersede_medical_note", {"data": {"original_id": note_id, "patient_id": 999, "doctor_id": 999,
            "note_date": TODAY, "note_details": {"summary": "BP follow-up (corrected)"}}})
        new_id = await db_manager.fetchval("SELECT max(id) FROM public.medical_notes WHERE patient_id=$1 AND status='active'", pid)
        await run(medidoc, d_pair, "invalidate_medical_note", {"data": {"id": new_id, "reason": "entered for wrong visit"}})
    await run(medidoc, d_pair, "create_prescription", {"medical_prescription": {"patient_id": 999, "patient_name": "x", "doctor_id": 999,
        "doctor_name": "x", "date_prescribed": TODAY, "medications": [{"medication_name": "Metformin", "dosage": "500 mg",
        "frequency": "twice daily", "duration": "90 days", "purpose": "diabetes", "form": "tablet"}], "notes": None}})
    await run(medidoc, d_pair, "order_medical_exam", {"exam": {"patient_id": 999, "doctor_id": 999, "ordered_exam": "HbA1c",
        "exam_type": "lab", "healthcare_provider_name": None}})
    await run(medidoc, d_pair, "report_medical_exam", {"medical_exam": {"patient_id": 999, "patient_name": "x", "doctor_id": None,
        "doctor_name": None, "exam_date": TODAY, "ordered_exam": "HbA1c", "exam_type": "lab", "healthcare_provider_name": None,
        "exam_results": [{"parameter": "HbA1c", "test": "HbA1c", "value": "7.4", "units": "%", "reference_range": "4.0-5.6", "comments": None}],
        "exam_summary": "Elevated"}})
    await run(medidoc, d_pair, "schedule_medical_procedure", {"data": {"doctor_id": 999, "procedure_text": "Echocardiogram",
        "scheduled_date": TUE.isoformat(), "scheduled_time": "14:00", "healthcare_provider_text": None, "location": None}})
    proc_id = await db_manager.fetchval("SELECT max(id) FROM public.medical_procedures WHERE patient_id=$1", pid)
    if proc_id:
        await run(medidoc, d_pair, "report_medical_procedure_detail", {"procedure_id": proc_id, "actor_role": "doctor",
            "entry_type": "observation", "events": [{"event_text": "LVEF", "event_value": "60", "event_unit": "%"}], "severity_level": 1})
        await run(medidoc, d_pair, "finalize_medical_procedure", {"procedure_id": proc_id, "final_status": "completed", "outcome_notes": "Normal"})
    await run(medidoc, d_pair, "delete_prescription", {"medical_prescription": {"patient_id": 999, "patient_name": "x", "doctor_id": 999,
        "doctor_name": "x", "date_prescribed": TODAY, "medications": [{"medication_name": "Metformin", "dosage": "500 mg",
        "frequency": None, "duration": None, "purpose": None, "form": None}], "notes": None}})
    await run(medidoc, d_pair, "get_medications", {"active_only": True}, label=" (after delete)")
    await run(medidoc, d_pair, "medibrief_summarize", {})

    # ---------------- writes: booking lifecycle (patient side)
    start = datetime.combine(MON, datetime.min.time(), tzinfo=timezone.utc).replace(hour=11)
    visit = {"doctor_id": did, "patient_id": 999, "start_time": start.isoformat(),
             "end_time": (start + timedelta(minutes=30)).isoformat(), "visit_type": "consultation", "visit_details": "harness"}
    await db_manager.execute("DELETE FROM public.medical_visits WHERE visit_details LIKE 'harness%'")
    await run(mediaid, p_pair, "create_booking", {"medical_visit": visit})
    await run(mediaid, p_pair, "create_booking", {"medical_visit": visit}, label=" (double-book)")
    results[-1] = (results[-1][0] and "no longer available" in results[-1][4],) + results[-1][1:]
    moved = dict(visit, visit_details="harness: bring lab results", end_time=(start + timedelta(minutes=45)).isoformat())
    await run(mediaid, p_pair, "update_booking", {"medical_visit": moved})
    await run(mediaid, p_pair, "delete_booking", {"medical_visit": moved})

    # ---------------- support tickets
    t = await run(mediaid, p_pair, "report_support", {"subject": "App crash", "description": "Crashes on upload",
        "category": "technical", "priority": "medium", "tags": None})
    tid = await db_manager.fetchval("SELECT max(id) FROM support.tickets")
    if tid:
        await run(mediaid, p_pair, "close_support", {"ticket_id": tid, "resolution_note": "fixed"})

    # ---------------- verify identity injection: rows must belong to the scoped patient/doctor
    leaked = await db_manager.fetchval("""
        SELECT count(*) FROM (
          SELECT patient_id, doctor_id FROM public.medical_prescriptions UNION ALL
          SELECT patient_id, doctor_id FROM public.medical_exam_orders UNION ALL
          SELECT patient_id, doctor_id FROM public.medical_procedures UNION ALL
          SELECT patient_id, doctor_id FROM public.medical_visits) x
        WHERE patient_id = 999 OR doctor_id = 999""")
    results.append((leaked == 0, "-", "-", "identity injection (no rows with spoofed ids)", f"spoofed rows: {leaked}"))

    ok = sum(1 for r in results if r[0])
    for r in results:
        print(("OK  " if r[0] else "FAIL"), f"[{r[1]}/{r[2]}]", r[3], "|", r[4] if not r[0] else r[4][:110])
    print(f"\n{ok}/{len(results)} tool calls OK")
    sys.exit(0 if ok == len(results) else 1)


asyncio.run(main())
