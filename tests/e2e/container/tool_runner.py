"""Runs assistant tool calls inside the ai container, the way the agent runtime does.

Not a test file: test_assistant_tools.py copies it into the container and sends the cases
as JSON on stdin. Each case is {"id", "thread", "tool", "args"}; `thread` picks the agent
and the identity the tool runs with. Argument values "$pid", "$did", "$latest_note",
"$latest_procedure" and "$latest_ticket" are looked up in the database just before the call.
Prints one JSON object: {"results": {id: {"output" | "error"}}, "spoofed_rows": int}.
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.getcwd())          # /app, where the service code lives

from agents.tool_context import ToolContext  # noqa: E402

from medicus_common.core.database import db_manager  # noqa: E402
from src.assistants.docsolo.docsolo_agent import docsolo  # noqa: E402
from src.assistants.medidoc.medidoc_agent import medidoc  # noqa: E402
from src.assistants.mediaid.mediaid_agent import mediaid  # noqa: E402
from src.assistants.medisolo.medisolo_agent import medisolo  # noqa: E402
from src.security.tool_guard import build_tool_context  # noqa: E402

AGENTS = {"patient_doctor": mediaid, "patient_solo": medisolo, "doctor_patient": medidoc, "doctor_solo": docsolo}
LOOKUPS = {
    "$latest_note": "SELECT max(id) FROM public.medical_notes WHERE patient_id = $1 AND status = 'active'",
    "$latest_procedure": "SELECT max(id) FROM public.medical_procedures WHERE patient_id = $1",
}


async def scopes():
    pat_user = await db_manager.fetchval("SELECT id FROM auth.users WHERE email = 'patient@example.com'")
    doc_user = await db_manager.fetchval("SELECT id FROM auth.users WHERE email = 'doctor@example.com'")
    pid = await db_manager.fetchval(
        "SELECT id FROM public.patients WHERE user_id = $1 AND relationship = 'main'", pat_user)
    did = await db_manager.fetchval("SELECT id FROM public.doctors WHERE user_id = $1", doc_user)
    rows = await db_manager.fetch("SELECT id, user_id, patient_id, doctor_id FROM dialog.conversations")
    convo = {(r["user_id"], r["patient_id"] is not None, r["doctor_id"] is not None): r["id"] for r in rows}

    def ctx(user_id, role, assistant, key, patient_id, doctor_id):
        return build_tool_context(user_id=user_id, actor_role=role, assistant=assistant,
                                  conversation_id=str(convo[key]), mirror_conversation_id=None,
                                  patient_id=patient_id, doctor_id=doctor_id)

    return pid, did, {
        "patient_doctor": ctx(pat_user, "patient", "mediaid", (pat_user, True, True), pid, did),
        "patient_solo": ctx(pat_user, "patient", "mediaid", (pat_user, True, False), pid, None),
        "doctor_patient": ctx(doc_user, "doctor", "medidoc", (doc_user, True, True), pid, did),
        "doctor_solo": ctx(doc_user, "doctor", "medidoc", (doc_user, False, True), None, did),
    }


async def resolve(value, pid, did):
    if isinstance(value, dict):
        return {k: await resolve(v, pid, did) for k, v in value.items()}
    if isinstance(value, list):
        return [await resolve(v, pid, did) for v in value]
    if value == "$pid":
        return pid
    if value == "$did":
        return did
    if value == "$latest_ticket":
        return await db_manager.fetchval("SELECT max(id) FROM support.tickets")
    if value in LOOKUPS:
        return await db_manager.fetchval(LOOKUPS[value], pid)
    return value


async def call(case, contexts, pid, did):
    agent = AGENTS[case["thread"]]
    tool = next((t for t in agent.tools if t.name == case["tool"]), None)
    if tool is None:
        return {"error": f"{agent.name} has no tool {case['tool']}"}
    args = json.dumps(await resolve(case["args"], pid, did))
    try:
        out = await tool.on_invoke_tool(ToolContext(context=contexts[case["thread"]], tool_name=tool.name,
                                                    tool_call_id="e2e", tool_arguments=args), args)
    except Exception as exc:  # noqa: BLE001 - reported to the test
        return {"error": f"{type(exc).__name__}: {exc}"}
    if not isinstance(out, str):
        out = json.dumps(out.model_dump() if hasattr(out, "model_dump") else out, default=str)
    return {"output": out}


async def main():
    cases = json.load(sys.stdin)
    await db_manager.initialize()
    pid, did, contexts = await scopes()
    await db_manager.execute("DELETE FROM public.medical_visits WHERE visit_details LIKE 'e2e%'")
    results = {}
    for case in cases:
        results[case["id"]] = await call(case, contexts, pid, did)
    spoofed = await db_manager.fetchval("""
        SELECT count(*) FROM (
          SELECT patient_id, doctor_id FROM public.medical_prescriptions UNION ALL
          SELECT patient_id, doctor_id FROM public.medical_exam_orders UNION ALL
          SELECT patient_id, doctor_id FROM public.medical_procedures UNION ALL
          SELECT patient_id, doctor_id FROM public.medical_visits) x
        WHERE patient_id = 999 OR doctor_id = 999""")
    print(json.dumps({"results": results, "spoofed_rows": spoofed}, default=str))


asyncio.run(main())
