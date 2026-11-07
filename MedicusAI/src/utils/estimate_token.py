def _estimate_tokens(text: str) -> int:
    """Estimate token count (approx 4 chars per token)."""
    if not text:
        return 0
    return len(text) // 4

def _estimate_messages_tokens(messages: list) -> int:
    """Estimate total tokens in a list of messages."""
    total = 0
    for msg in messages:
        if isinstance(msg, dict):
            content = msg.get("content", "")
            if isinstance(content, str):
                total += _estimate_tokens(content)
            elif isinstance(content, dict):
                total += _estimate_tokens(str(content))
        elif isinstance(msg, str):
            total += _estimate_tokens(msg)
    return total

def _estimate_tools_tokens(tools: list) -> int:
    """Estimate tokens for tool definitions."""
    total = 0
    for tool in tools:
        if hasattr(tool, 'name'):
            total += _estimate_tokens(tool.name or "")
        if hasattr(tool, 'description'):
            total += _estimate_tokens(tool.description or "")
        if hasattr(tool, 'params_json_schema'):
            import json
            total += _estimate_tokens(json.dumps(tool.params_json_schema or {}))
    return total