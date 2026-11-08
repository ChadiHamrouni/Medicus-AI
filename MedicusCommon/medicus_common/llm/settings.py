"""
Model-provider configuration.

Medicus never hard-codes a vendor. Pick a provider with LLM_PROVIDER:

  openai             OpenAI API (default). Uses the Responses API.
  openai_compatible  Any server exposing the OpenAI Chat Completions API:
                     Ollama, vLLM, LM Studio, llama.cpp server, LocalAI,
                     OpenRouter, Groq, Together, Azure OpenAI (v1 endpoint)...
  litellm            Anything LiteLLM supports (Anthropic, Gemini, Bedrock,
                     Mistral, Cohere, ...). Model names use LiteLLM syntax,
                     e.g. "anthropic/claude-sonnet-4-5", "gemini/gemini-2.5-flash".

Every assistant "role" (tools, text, guardrail, ...) can use its own model via
LLM_MODEL_<ROLE>; otherwise LLM_MODEL is used for all of them. With the openai
provider, unset roles fall back to the defaults in core/config.json.
"""

from functools import lru_cache
from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Provider = Literal["openai", "openai_compatible", "litellm"]
AudioProvider = Literal["openai", "openai_compatible", "none"]

ROLES = ("tools", "text", "guardrail", "triage", "vision", "lab", "doc", "summary", "voice")

# Default role -> key in core/config.json "llms" section (used only for provider=openai).
_CONFIG_KEYS = {
    "tools": "tools_llm",
    "text": "text_llm",
    "guardrail": "guardrail_llm",
    "triage": "triage_llm",
    "vision": "vision_llm",
    "lab": "lab_llm",
    "doc": "doc_llm",
    "summary": "text_llm",
    "voice": "tools_llm",
}


class LLMSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    provider: Provider = Field("openai", alias="LLM_PROVIDER")
    api_key: Optional[str] = Field(None, alias="LLM_API_KEY")
    openai_api_key: Optional[str] = Field(None, alias="OPENAI_API_KEY")
    base_url: Optional[str] = Field(None, alias="LLM_BASE_URL")
    timeout_seconds: float = Field(120.0, alias="LLM_TIMEOUT_SECONDS")

    model: Optional[str] = Field(None, alias="LLM_MODEL")
    model_tools: Optional[str] = Field(None, alias="LLM_MODEL_TOOLS")
    model_text: Optional[str] = Field(None, alias="LLM_MODEL_TEXT")
    model_guardrail: Optional[str] = Field(None, alias="LLM_MODEL_GUARDRAIL")
    model_triage: Optional[str] = Field(None, alias="LLM_MODEL_TRIAGE")
    model_vision: Optional[str] = Field(None, alias="LLM_MODEL_VISION")
    model_lab: Optional[str] = Field(None, alias="LLM_MODEL_LAB")
    model_doc: Optional[str] = Field(None, alias="LLM_MODEL_DOC")
    model_summary: Optional[str] = Field(None, alias="LLM_MODEL_SUMMARY")
    # Assistant model for live voice conversations; a smaller model answers faster.
    model_voice: Optional[str] = Field(None, alias="LLM_MODEL_VOICE")

    # OpenAI reasoning models: defaults to "low". Other providers: sent only when set;
    # "none" turns off thinking on local models (Qwen3, DeepSeek-R1, gpt-oss via Ollama/vLLM).
    reasoning_effort: Optional[Literal["none", "minimal", "low", "medium", "high"]] = Field(None, alias="LLM_REASONING_EFFORT")
    parallel_tool_calls: Optional[bool] = Field(None, alias="LLM_PARALLEL_TOOL_CALLS")
    # Make the assistant's first step a tool call (tool_choice="required"); it reverts to
    # "auto" after the first call. Recommended for small local models, which otherwise
    # answer record questions from memory and invent data.
    force_tool_use: bool = Field(False, alias="LLM_FORCE_TOOL_USE")
    supports_vision: bool = Field(True, alias="LLM_SUPPORTS_VISION")
    guardrail_enabled: bool = Field(True, alias="LLM_GUARDRAIL_ENABLED")

    # Speech-to-text (voice messages).
    stt_provider: Optional[AudioProvider] = Field(None, alias="STT_PROVIDER")
    stt_base_url: Optional[str] = Field(None, alias="STT_BASE_URL")
    stt_api_key: Optional[str] = Field(None, alias="STT_API_KEY")
    stt_model: str = Field("whisper-1", alias="STT_MODEL")

    # Text-to-speech (spoken replies).
    tts_provider: Optional[AudioProvider] = Field(None, alias="TTS_PROVIDER")
    tts_base_url: Optional[str] = Field(None, alias="TTS_BASE_URL")
    tts_api_key: Optional[str] = Field(None, alias="TTS_API_KEY")
    tts_model: str = Field("gpt-4o-mini-tts", alias="TTS_MODEL")
    tts_voice: str = Field("sage", alias="TTS_VOICE")
    tts_format: str = Field("wav", alias="TTS_FORMAT")

    # Embeddings for the doctors' knowledge base (optional: keyword search works without).
    # Any server implementing /v1/embeddings; defaults to the LLM server and key.
    embedding_model: Optional[str] = Field(None, alias="EMBEDDING_MODEL")
    embedding_base_url: Optional[str] = Field(None, alias="EMBEDDING_BASE_URL")
    embedding_api_key: Optional[str] = Field(None, alias="EMBEDDING_API_KEY")

    @property
    def resolved_api_key(self) -> Optional[str]:
        return self.api_key or self.openai_api_key

    @property
    def resolved_stt_provider(self) -> AudioProvider:
        if self.stt_provider:
            return self.stt_provider
        if self.stt_base_url:
            return "openai_compatible"
        return "openai" if self.provider == "openai" else "none"

    @property
    def resolved_tts_provider(self) -> AudioProvider:
        if self.tts_provider:
            return self.tts_provider
        if self.tts_base_url:
            return "openai_compatible"
        return "openai" if self.provider == "openai" else "none"

    def model_for(self, role: str) -> str:
        if role not in ROLES:
            raise ValueError(f"Unknown model role '{role}'. Expected one of {ROLES}")
        explicit = getattr(self, f"model_{role}") or self.model
        if explicit:
            return explicit
        if self.provider == "openai":
            from medicus_common.core.config_ai import Config

            default = Config().get("llms", _CONFIG_KEYS[role], "model")
            if default:
                return default
        raise ValueError(
            f"No model configured for role '{role}'. Set LLM_MODEL (or LLM_MODEL_{role.upper()})."
        )


@lru_cache
def get_llm_settings() -> LLMSettings:
    return LLMSettings()
