import base64
from agents import Runner

async def should_flush_to_db(convo_id: str, payload_status: str) -> bool:
    key = f"history:{convo_id}"
    if payload_status == "INACTIVE":
        return True
    ttl = await redis.ttl(key)
    # ttl = -2 (no key) or -1 (persisted)
    if ttl and 0 < ttl < 3600:  # less than 1h remaining
        return True
    return False

def _data_url_from_file(file_path: str, mime_type: str) -> str:
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    return f"data:{mime_type};base64,{b64}"


async def _runner_run(starting_agent, input_data, context: dict | None):
    """Compatibility wrapper for Runner.run"""
    try:
        result = await Runner.run(starting_agent=starting_agent, input=input_data, context=context)
        return result
    except TypeError:
        result = await Runner.run(starting_agent, input_data, context=context)
        return result

def _normalize_history(history: list) -> list:
    """Normalize history items to standard format"""
    normalized = []
    if not history:
        return normalized

    for msg in history:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role") or "user"
        content = msg.get("content") or ""
        normalized.append({"role": role, "content": content})
    return normalized

