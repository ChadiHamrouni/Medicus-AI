"""Vendor-neutral LLM access for all Medicus services. See settings.py for configuration."""

from medicus_common.llm.client import (
    ModelNotConfiguredError,
    complete,
    get_agent_model,
    get_client,
    get_model_settings,
    image_part,
    model_name,
    parse_structured,
    synthesize_speech,
    text_part,
    transcribe,
)
from medicus_common.llm.settings import LLMSettings, get_llm_settings

__all__ = [
    "LLMSettings",
    "ModelNotConfiguredError",
    "complete",
    "get_agent_model",
    "get_client",
    "get_llm_settings",
    "get_model_settings",
    "image_part",
    "model_name",
    "parse_structured",
    "synthesize_speech",
    "text_part",
    "transcribe",
]
