"""
OpenAI Realtime API Tool Configuration

Extracts tool schemas from MedicusAI agents and converts them to
OpenAI Realtime API format for function calling support.

IMPORTANT: WebRTC is DOCTOR-ONLY, so only medidoc and docsolo agents are used.
"""

from typing import List, Dict, Any
from agents import Agent

from src.assistants.medidoc.medidoc_agent import medidoc
from src.assistants.docsolo.docsolo_agent import docsolo


def extract_tools_schema(agent: Agent) -> List[Dict[str, Any]]:
    """
    Extract OpenAI-compatible tool schemas from an agent.

    Args:
        agent: The MedicusAI agent (mediaid, medidoc, etc.)

    Returns:
        List of tool definitions in OpenAI Realtime API format
    """
    tools = []

    for tool in agent.tools:
        # Skip WebSearchTool and other built-in tools that don't have schema attributes
        # These are handled natively by OpenAI Realtime API
        if not hasattr(tool, 'description') or not hasattr(tool, 'params_json_schema'):
            continue

        openai_tool = {
            "type": "function",
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.params_json_schema,
        }
        tools.append(openai_tool)

    return tools


def get_agent_tools(assistant: str, patient_id: int = None) -> List[Dict[str, Any]]:
    """
    Get tool schemas for the specified assistant type.

    IMPORTANT: WebRTC is DOCTOR-ONLY, so this should only be called with assistant='medidoc'.
    - If patient_id exists: returns medidoc tools (doctor-patient conversation)
    - If patient_id is None: returns docsolo tools (doctor solo with Sara)

    Args:
        assistant: MUST be 'medidoc' for WebRTC sessions
        patient_id: Patient ID (determines medidoc vs docsolo)

    Returns:
        List of OpenAI-compatible tool definitions

    Raises:
        ValueError: If assistant is not 'medidoc' (WebRTC is doctor-only)
    """
    # WebRTC is doctor-only, only allow medidoc assistant
    if assistant != "medidoc":
        raise ValueError(
            f"WebRTC only supports 'medidoc' assistant (doctor conversations). "
            f"Got: {assistant}. Use text-based interface for patient conversations."
        )

    # Select agent based on patient_id
    agent = medidoc if patient_id else docsolo

    return extract_tools_schema(agent)
