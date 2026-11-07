"""
Global trace storage for test mode.

This module provides a simple way to store and retrieve execution traces
during testing without modifying the CloudPayload model.
"""

from typing import Dict, List, Any, Optional
from uuid import UUID

# Global storage for execution traces
_trace_storage: Dict[str, List[Dict[str, Any]]] = {}


def store_trace(convo_id: str | UUID, trace: List[Dict[str, Any]]) -> None:
    """Store execution trace for a conversation."""
    key = str(convo_id)
    _trace_storage[key] = trace


def get_trace(convo_id: str | UUID) -> Optional[List[Dict[str, Any]]]:
    """Retrieve execution trace for a conversation."""
    key = str(convo_id)
    return _trace_storage.get(key)


def clear_trace(convo_id: str | UUID) -> None:
    """Clear execution trace for a conversation."""
    key = str(convo_id)
    if key in _trace_storage:
        del _trace_storage[key]


def clear_all_traces() -> None:
    """Clear all stored traces."""
    _trace_storage.clear()