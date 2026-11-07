
from datetime import datetime, date, time, UTC
from typing import Any

from medicus_common.core.exceptions import ValidationError
from medicus_common.core.logging_config import logger
from medicus_common.core.audit_queue import AuditQueueManager


def _ensure_iso_datetime(dt):
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt)
        except Exception as e:
            raise ValidationError(f"Invalid datetime format: {dt}")
    if isinstance(dt, datetime):
        return dt
    raise ValidationError("recorded_at must be a datetime or ISO datetime string")


def _make_json_serializable(obj: Any) -> Any:
    """Recursively convert non-JSON-serializable types to strings."""
    if isinstance(obj, dict):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_make_json_serializable(v) for v in obj]
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, time):
        return obj.isoformat()
    return obj


async def _insert_audit(user_id, actor_role, tool_name, payload, result, convo_id, message_id):
    """
    Public-facing audit function. It delegates the logging task to the background
    AuditQueueManager immediately (non-blocking), using convo_id and message_id
    for traceability.
    """
    try:
        log_data = {
            "created_at": datetime.now(UTC),
            "user_id": user_id,
            "actor_role": actor_role,
            "tool_name": tool_name,
            "client_request_id": f"{convo_id}:{message_id}" if convo_id and message_id else None,
            "payload": _make_json_serializable(payload),
            "result": _make_json_serializable(result)
        }

        # The function schedules the log write task to the background queue
        await AuditQueueManager.enqueue_log(log_data)

    except Exception:
        # Audit must not block main flow; log and continue
        logger.warning("Failed to queue audit log payload", exc_info=True)

    return
