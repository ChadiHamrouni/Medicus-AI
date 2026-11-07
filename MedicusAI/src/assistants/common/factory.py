from pathlib import Path
from typing import Sequence

from agents import Agent, Tool, set_tracing_disabled

from medicus_common.core.artifact_loader import load_artifact_file, load_artifact_files
from medicus_common.core.config_ai import Config
from medicus_common.llm import get_agent_model, get_llm_settings, get_model_settings

from src.guardrails import input_guardrail
from src.security.tool_guard import guard_agent

# The Agents SDK uploads traces to OpenAI by default; never ship PHI there.
set_tracing_disabled(True)

_COMMON_DIR = Path(__file__).resolve().parent


def load_instructions(agent_dir: Path, instructions_file: str) -> str:
    """System prompt = shared rules + agent role + shared and agent-specific skills."""
    assistant_instructions = load_artifact_file(agent_dir / instructions_file, "instructions")
    common_instructions = load_artifact_file(_COMMON_DIR / "common_instructions.md", "instructions")
    skills = load_artifact_files(_COMMON_DIR / "skills") + "\n\n" + load_artifact_files(agent_dir / "skills")
    return (
        f"# SYSTEM RULES\n\n{common_instructions}"
        f"\n\n---\n\n# AGENT ROLE\n\n{assistant_instructions}"
        f"\n\n---\n\n# SKILL DOMAINS\n\n{skills}"
    )


def build_assistant(name: str, agent_dir: Path, instructions_file: str, tools: Sequence[Tool]) -> Agent:
    max_tokens = Config().get("llms", "tools_llm", "max_tokens")
    agent = Agent(
        name=name,
        model=get_agent_model("tools"),
        instructions=load_instructions(agent_dir, instructions_file),
        tools=list(tools),
        model_settings=get_model_settings("tools", max_tokens=max_tokens, tools=True),
        input_guardrails=[input_guardrail] if get_llm_settings().guardrail_enabled else [],
    )
    return guard_agent(agent)
