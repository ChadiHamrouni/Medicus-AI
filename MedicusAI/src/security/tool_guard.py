"""
Tool guard: identity and ownership for every assistant tool come from the
server-built run context, never from model-generated arguments.

For each FunctionTool:
  * identity parameters (medical_context, audit, session_context, patient_id,
    created_by, ...) are removed from the JSON schema shown to the model and
    injected at call time from the trusted context;
  * patient_id / doctor_id nested inside argument objects are overwritten;
  * tools addressing an existing record by id verify the record belongs to the
    patient (or user) in scope before running.

A prompt-injected model therefore cannot read or write another patient's data.
"""

import copy
import dataclasses
import json
from typing import Any, Awaitable, Callable, Optional

from agents import Agent, FunctionTool
from agents.exceptions import ModelBehaviorError
from agents.tool import set_function_tool_failure_error_function
from pydantic import ValidationError as PydanticValidationError

from medicus_common.core.exceptions import ValidationError as MedicusValidationError
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger

_GUARDED_FLAG = "_medicus_guarded"


def _medical_context(ctx: dict) -> dict:
    return {"patient_id": ctx.get("patient_id"), "doctor_id": ctx.get("doctor_id"), "healthcare_provider_id": None}


def _audit_context(ctx: dict) -> dict:
    return {
        "actor_user_id": ctx.get("user_id"),
        "actor_role": ctx.get("actor_role") or "patient",
        "convo_id": ctx.get("convo_id") or 0,
        "message_id": ctx.get("message_id") or 0,
    }


def _session_context(ctx: dict) -> dict:
    return {
        "conversation_id": ctx.get("conversation_id"),
        "patient_name": ctx.get("patient_name"),
        "patient_age": ctx.get("patient_age"),
        "patient_gender": ctx.get("patient_gender"),
    }


# Parameters always injected from trusted context (and hidden from the model).
_INJECTORS: dict[str, Callable[[dict], Any]] = {
    "medical_context": _medical_context,
    "audit": _audit_context,
    "audit_context": _audit_context,
    "session_context": _session_context,
    "patient_id": lambda ctx: ctx.get("patient_id"),
    "created_by": lambda ctx: ctx.get("user_id"),
    "resolved_by": lambda ctx: ctx.get("user_id"),
    "conversation_id": lambda ctx: ctx.get("conversation_id"),
}

# Tools whose doctor_id refers to the acting doctor (private data). Elsewhere a
# doctor_id is a public directory lookup (profile, free slots) and stays free.
_SELF_DOCTOR_TOOLS = {"get_doctor_performance_metrics", "search_conversations"}
_SELF_ACTOR_TOOLS = {"report_medical_procedure_detail"}  # actor_id = acting doctor

_PROCEDURE_OWNER = "SELECT patient_id FROM public.medical_procedures WHERE id = $1"
_NOTE_OWNER = "SELECT patient_id FROM public.medical_notes WHERE id = $1"
_TICKET_OWNER = "SELECT created_by FROM support.tickets WHERE id = $1"

# tool name -> (argument path, ownership query, context key the owner must equal)
_OWNERSHIP: dict[str, tuple[str, str, str]] = {
    "get_medical_procedure_details": ("procedure_id", _PROCEDURE_OWNER, "patient_id"),
    "report_medical_procedure_detail": ("procedure_id", _PROCEDURE_OWNER, "patient_id"),
    "finalize_medical_procedure": ("procedure_id", _PROCEDURE_OWNER, "patient_id"),
    "cancel_medical_procedure": ("procedure_id", _PROCEDURE_OWNER, "patient_id"),
    "supersede_medical_procedure": ("data.original_id", _PROCEDURE_OWNER, "patient_id"),
    "supersede_medical_note": ("data.original_id", _NOTE_OWNER, "patient_id"),
    "invalidate_medical_note": ("data.id", _NOTE_OWNER, "patient_id"),
    "close_support": ("ticket_id", _TICKET_OWNER, "user_id"),
}


def _injected_params(tool: FunctionTool) -> list[str]:
    props = tool.params_json_schema.get("properties", {})
    names = [p for p in props if p in _INJECTORS]
    if tool.name in _SELF_DOCTOR_TOOLS and "doctor_id" in props:
        names.append("doctor_id")
    if tool.name in _SELF_ACTOR_TOOLS and "actor_id" in props:
        names.append("actor_id")
    return names


def _strip_schema(schema: dict, hidden: list[str]) -> dict:
    schema = copy.deepcopy(schema)
    props = schema.get("properties", {})
    for name in hidden:
        props.pop(name, None)
    if "required" in schema:
        schema["required"] = [r for r in schema["required"] if r not in hidden]
    return schema


def _dig(args: dict, path: str) -> Any:
    value: Any = args
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def _error(message: str) -> str:
    return json.dumps({"error": message})


def _trusted(tool_ctx: Any) -> dict:
    ctx = getattr(tool_ctx, "context", None)
    return ctx if isinstance(ctx, dict) else {}


def _coerce_to_schema(value: Any, schema: dict, defs: dict, depth: int = 0) -> Any:
    """Repair common argument mistakes of smaller models, guided by the tool's JSON schema.

    * nested objects/arrays sent as JSON strings ("{\"a\": 1}") are parsed;
    * numbers/booleans where the schema wants a string are stringified (135 -> "135").

    Pydantic v2 rejects both, and the model rarely recovers on its own. Anything
    that does not fit is left untouched for normal validation to report.
    """
    if depth > 12 or not isinstance(schema, dict):
        return value
    if "$ref" in schema:
        return _coerce_to_schema(value, defs.get(schema["$ref"].split("/")[-1], {}), defs, depth + 1)
    for key in ("anyOf", "oneOf"):
        if key in schema:
            options = [o for o in schema[key] if o.get("type") != "null"]
            if value is None or not options:
                return value
            # Prefer an option the value already matches; otherwise try coercing to the first.
            for option in options:
                resolved = defs.get(option["$ref"].split("/")[-1], {}) if "$ref" in option else option
                if _matches(value, resolved):
                    return _coerce_to_schema(value, option, defs, depth + 1)
            return _coerce_to_schema(value, options[0], defs, depth + 1)

    expected = schema.get("type")
    if expected in ("object", "array") and isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict if expected == "object" else list):
                value = parsed
        except (json.JSONDecodeError, TypeError):
            return value
    if expected == "object" and isinstance(value, dict):
        props = schema.get("properties", {})
        return {k: _coerce_to_schema(v, props[k], defs, depth + 1) if k in props else v for k, v in value.items()}
    if expected == "array" and isinstance(value, list):
        return [_coerce_to_schema(v, schema.get("items", {}), defs, depth + 1) for v in value]
    if expected == "string" and isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return value


def _matches(value: Any, schema: dict) -> bool:
    t = schema.get("type")
    return {
        "object": isinstance(value, dict), "array": isinstance(value, list), "string": isinstance(value, str),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool), "boolean": isinstance(value, bool),
    }.get(t, False)


def _tool_failure_handler(tool_name: str):
    """Log tool exceptions for operators; give the model actionable text for bad input.

    The SDK default swallows the exception (logged at DEBUG only) and tells the model
    "An error occurred". Validation problems are the model's to fix, so they are
    returned verbatim (they describe arguments, not internals); anything else stays generic.
    """
    def handler(ctx: Any, error: Exception) -> str:
        # Malformed arguments from the model arrive as ModelBehaviorError wrapping the
        # pydantic error: unwrap so the model sees which field was wrong.
        cause = error.__cause__ or error.__context__
        if isinstance(error, ModelBehaviorError) and cause is not None:
            if isinstance(cause, PydanticValidationError):
                # Field paths and messages only: input values may be patient data.
                problems = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in cause.errors()[:8])
                logger.warning(f"[TOOL] {tool_name} invalid arguments from model: {problems}")
                return (f"The tool rejected the arguments ({problems}). "
                        "Fix the arguments to match the tool schema and call it again.")
            logger.warning(f"[TOOL] {tool_name} invalid arguments ({type(cause).__name__})")
        if isinstance(error, ModelBehaviorError):
            logger.warning(f"[TOOL] {tool_name} invalid arguments from model")
            return ("The arguments did not match the tool's JSON schema (wrong field names, types or nesting). "
                    "Re-read the parameter schema and call the tool again with corrected arguments.")
        if isinstance(error, (PydanticValidationError, MedicusValidationError, ValueError)):
            logger.warning(f"[TOOL] {tool_name} rejected input: {error}")
            detail = str(error).split("\n    For further information")[0][:600]
            return f"The tool rejected the arguments: {detail}. Fix the arguments and call the tool again."
        logger.error(f"[TOOL] {tool_name} failed: {type(error).__name__}: {error}", exc_info=error)
        return "An error occurred while running the tool. Please try again."
    return handler


def guard_tool(tool: FunctionTool) -> FunctionTool:
    if getattr(tool, _GUARDED_FLAG, False):
        return tool

    hidden = _injected_params(tool)
    full_schema = tool.params_json_schema
    original: Callable[[Any, str], Awaitable[Any]] = tool.on_invoke_tool
    ownership = _OWNERSHIP.get(tool.name)

    async def on_invoke_tool(tool_ctx: Any, raw_input: str) -> Any:
        ctx = _trusted(tool_ctx)
        if not ctx.get("user_id"):
            logger.error(f"[TOOL_GUARD] {tool.name} invoked without trusted context")
            return _error("This action is unavailable right now.")

        try:
            args = json.loads(raw_input) if raw_input else {}
        except json.JSONDecodeError:
            return _error("Invalid tool arguments.")
        if not isinstance(args, dict):
            return _error("Invalid tool arguments.")
        args = _coerce_to_schema(args, full_schema, full_schema.get("$defs", {}))

        for name in hidden:
            if name == "doctor_id":
                args[name] = ctx.get("doctor_id")
            elif name == "actor_id":
                args[name] = ctx.get("doctor_id") or ctx.get("user_id")
            else:
                args[name] = _INJECTORS[name](ctx)

        if "patient_id" in hidden and args.get("patient_id") is None:
            return _error("No patient is associated with this conversation.")

        # Nested argument objects supplied by the model (bookings, prescriptions, ...).
        # Injected objects are trusted as-is: medical_context legitimately has no
        # patient in doctor-only conversations.
        for key, value in args.items():
            if key in hidden:
                continue
            if isinstance(value, dict):
                if "patient_id" in value:
                    if ctx.get("patient_id") is None:
                        return _error("No patient is associated with this conversation.")
                    value["patient_id"] = ctx["patient_id"]
                if "doctor_id" in value and ctx.get("doctor_id") is not None:
                    value["doctor_id"] = ctx["doctor_id"]

        if ownership:
            path, query, ctx_key = ownership
            record_id = _dig(args, path)
            try:
                owner = await db_manager.fetchval(query, int(record_id)) if record_id is not None else None
            except (TypeError, ValueError):
                owner = None
            if owner is None or owner != ctx.get(ctx_key):
                logger.warning(f"[TOOL_GUARD] {tool.name}: record {record_id} outside scope of user {ctx.get('user_id')}")
                return _error("Record not found.")

        return _to_model_text(await original(tool_ctx, json.dumps(args, default=str)))

    set_function_tool_failure_error_function(tool, _tool_failure_handler(tool.name))
    guarded = dataclasses.replace(
        tool,
        params_json_schema=_strip_schema(tool.params_json_schema, hidden),
        on_invoke_tool=on_invoke_tool,
    )
    set_function_tool_failure_error_function(guarded, _tool_failure_handler(tool.name))
    setattr(guarded, _GUARDED_FLAG, True)
    return guarded


def _to_model_text(result: Any) -> Any:
    """Serialize tool results as JSON for the model.

    Without this the SDK falls back to str(), which renders Pydantic models as
    Python reprs (``Entry(id=1, recorded_at=datetime.datetime(...))``): more
    tokens and harder for smaller/local models to read.
    """
    if result is None or isinstance(result, str):
        return result
    if hasattr(result, "model_dump_json"):
        return result.model_dump_json(exclude_none=True)
    if isinstance(result, (dict, list, tuple)):
        return json.dumps(
            [r.model_dump(mode="json") if hasattr(r, "model_dump") else r for r in result]
            if isinstance(result, (list, tuple)) else result,
            default=str,
        )
    return result


def guard_agent(agent: Agent) -> Agent:
    """Return `agent` with every function tool wrapped by the guard."""
    agent.tools = [guard_tool(t) if isinstance(t, FunctionTool) else t for t in agent.tools]
    return agent


def build_tool_context(
    *,
    user_id: int,
    actor_role: str,
    assistant: str,
    conversation_id: str,
    mirror_conversation_id: Optional[str],
    patient_id: Optional[int],
    doctor_id: Optional[int],
    patient_name: Optional[str] = None,
    patient_age: Optional[int] = None,
    patient_gender: Optional[str] = None,
) -> dict:
    """Trusted run context consumed by the guard. Built only from a ChatScope."""
    return {
        "user_id": user_id,
        "actor_role": actor_role,
        "actor_user_id": user_id,
        "assistant": assistant,
        "conversation_id": conversation_id,
        "mirror_convo_id": mirror_conversation_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "patient_name": patient_name,
        "patient_age": patient_age,
        "patient_gender": patient_gender,
        # AuditContext stores an int; a stable 31-bit digest of the UUID.
        "convo_id": int(conversation_id.replace("-", "")[:7], 16) if conversation_id else 0,
        "message_id": 0,
    }
