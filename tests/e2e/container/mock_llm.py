"""OpenAI-compatible chat server that makes the agent call one real tool, then answer.

Started inside the ai container by test_agent_mock_llm.py. First request of a turn: call the
first tool from TOOL_PLAN that the agent offers. Once a tool result is present: answer with
text quoting it. Every request is appended to MOCK_LLM_LOG so the test can see what the agent
sent (roles, offered tools, whether injected messages reached the model).
"""

import json
import os
import time
import uuid

from fastapi import FastAPI, Request

app = FastAPI()
LOG = os.environ.get("MOCK_LLM_LOG", "/tmp/medicus_e2e_mock_llm.log")
TOOL_PLAN = ["get_medical_vitals", "get_doctor_agenda", "get_medications"]
TOOL_ARGS = {"get_doctor_agenda": {"start_date": None, "end_date": None, "upcoming_only": True},
             "get_medications": {"active_only": True}}


@app.get("/v1/models")
async def models():
    return {"object": "list", "data": [{"id": "mock-model", "object": "model"}]}


@app.post("/v1/chat/completions")
async def chat(request: Request):
    body = await request.json()
    tools = [t["function"]["name"] for t in body.get("tools") or []]
    messages = body.get("messages", [])
    tool_results = [m for m in messages if m.get("role") == "tool"]
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "tools": tools,
            "roles": [m.get("role") for m in messages],
            "tool_results": len(tool_results),
            "texts": [str(m.get("content")) for m in messages if m.get("role") in ("system", "user")],
        }) + "\n")

    base = {"id": f"chatcmpl-{uuid.uuid4().hex[:8]}", "object": "chat.completion", "created": int(time.time()),
            "model": body.get("model", "mock-model"),
            "usage": {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20}}
    wanted = next((t for t in TOOL_PLAN if t in tools), None)
    if wanted and not tool_results:
        call = {"id": "call_1", "type": "function",
                "function": {"name": wanted, "arguments": json.dumps(TOOL_ARGS.get(wanted, {}))}}
        return {**base, "choices": [{"index": 0, "finish_reason": "tool_calls",
                                     "message": {"role": "assistant", "content": None, "tool_calls": [call]}}]}
    result = tool_results[-1]["content"] if tool_results else "no tool was called"
    return {**base, "choices": [{"index": 0, "finish_reason": "stop", "message": {
        "role": "assistant", "content": f"MOCK ANSWER based on tool output: {str(result)[:300]}"}}]}
