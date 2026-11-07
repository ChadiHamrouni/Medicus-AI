"""
WebRTC tool execution endpoint.

The device receives a function_call over the OpenAI data channel, POSTs it here,
and forwards our output back to OpenAI. Identity comes from the conversation
scope, never from the request body.
"""

from fastapi import APIRouter, Depends

from medicus_common.core.logging_config import logger
from medicus_common.models.convo.realtime import ToolCallRequest
from medicus_common.models.user.user_core import User

from src.api.auth_dependencies import get_current_user
from src.api.realtime.session import _require_realtime
from src.security.scope import resolve_chat_scope
from src.utils.tool_executor import execute_tool_call

router = APIRouter()


@router.post("/realtime/execute-tool")
async def execute_tool(request: ToolCallRequest, current_user: User = Depends(get_current_user)):
    _require_realtime()
    scope = await resolve_chat_scope(current_user, request.convo_id)
    try:
        result = await execute_tool_call(tool_name=request.tool_name, arguments=request.arguments, scope=scope)
        return {"output": result}
    except Exception:
        logger.exception(f"[REALTIME] Tool {request.tool_name} failed")
        return {"output": '{"error": "Tool execution failed"}'}
