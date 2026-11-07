"""Execute assistant tools outside the Agents Runner (used by realtime voice sessions)."""

import json
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict

from agents.tool_context import ToolContext

from medicus_common.core.logging_config import logger

from src.assistants.docsolo.docsolo_agent import docsolo
from src.assistants.medidoc.medidoc_agent import medidoc
from src.security.scope import ChatScope
from src.security.tool_guard import build_tool_context


class _JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date, time)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        return super().default(obj)


async def execute_tool_call(tool_name: str, arguments: Dict[str, Any], scope: ChatScope) -> str:
    """Run `tool_name` with model-supplied `arguments`; identity comes from `scope` via the tool guard."""
    if scope.assistant != "medidoc":
        return json.dumps({"error": "Realtime tools are available to doctors only"})

    agent = medidoc if scope.patient_id else docsolo
    tool = next((t for t in agent.tools if getattr(t, "name", None) == tool_name), None)
    if tool is None:
        return json.dumps({"error": f"Unknown tool '{tool_name}'"})

    context = build_tool_context(
        user_id=scope.user_id,
        actor_role=scope.actor_role,
        assistant=scope.assistant,
        conversation_id=scope.conversation_id,
        mirror_conversation_id=scope.mirror_conversation_id,
        patient_id=scope.patient_id,
        doctor_id=scope.doctor_id,
    )
    logger.info(f"[REALTIME] Executing tool: {tool_name}")
    raw_args = json.dumps(arguments or {})
    tool_ctx = ToolContext(context=context, tool_name=tool_name, tool_call_id=f"realtime-{tool_name}", tool_arguments=raw_args)
    result = await tool.on_invoke_tool(tool_ctx, raw_args)
    if isinstance(result, str):
        return result
    return json.dumps(result.model_dump() if hasattr(result, "model_dump") else result, cls=_JSONEncoder)
