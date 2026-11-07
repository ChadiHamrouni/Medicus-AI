"""Minimal OpenAI-compatible chat server that drives a real tool call.

Turn 1 (no tool results yet): ask for the tool named in TOOL_PLAN that the request offers.
Turn 2 (tool result present):   answer with text quoting the tool output.
Records every request to /tmp/mock_llm.log so the test can inspect what the agent sent.
"""
import json
import time
import uuid

from fastapi import FastAPI, Request

app = FastAPI()
TOOL_PLAN = ["get_medical_vitals", "get_doctor_agenda", "get_medications"]


def _log(entry):
    with open("/tmp/mock_llm.log", "a") as f:
        f.write(json.dumps(entry) + "\n")


@app.get("/v1/models")
async def models():
    return {"object": "list", "data": [{"id": "mock-model", "object": "model"}]}


@app.post("/v1/chat/completions")
async def chat(request: Request):
    body = await request.json()
    tools = [t["function"]["name"] for t in body.get("tools") or []]
    msgs = body.get("messages", [])
    tool_msgs = [m for m in msgs if m.get("role") == "tool"]
    _log({"tools": tools, "roles": [m.get("role") for m in msgs], "n_tool_results": len(tool_msgs),
          "system_preview": [str(m.get("content")) for m in msgs if m.get("role") == "system"], "user_msgs": [str(m.get("content")) for m in msgs if m.get("role") == "user"],
          "tool_schemas": {t["function"]["name"]: sorted(t["function"].get("parameters", {}).get("properties", {}))
                           for t in body.get("tools") or [] if t["function"]["name"] in TOOL_PLAN}})
    base = {"id": f"chatcmpl-{uuid.uuid4().hex[:8]}", "object": "chat.completion", "created": int(time.time()),
            "model": body.get("model", "mock-model"),
            "usage": {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20}}
    wanted = next((t for t in TOOL_PLAN if t in tools), None)
    if wanted and not tool_msgs:
        return {**base, "choices": [{"index": 0, "finish_reason": "tool_calls", "message": {
            "role": "assistant", "content": None,
            "tool_calls": [{"id": "call_1", "type": "function",
                            "function": {"name": wanted, "arguments": json.dumps(
                                {"start_date": None, "end_date": None, "upcoming_only": True} if wanted == "get_doctor_agenda"
                                else {"active_only": True} if wanted == "get_medications" else {})}}]}}]}
    result = tool_msgs[-1]["content"] if tool_msgs else "no tool was called"
    return {**base, "choices": [{"index": 0, "finish_reason": "stop", "message": {
        "role": "assistant", "content": f"MOCK ANSWER based on tool output: {str(result)[:300]}"}}]}
