"""Provider-agnostic access to chat, structured output, vision and speech models."""

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional, Type, TypeVar

from openai import AsyncOpenAI, BadRequestError
from pydantic import BaseModel

from medicus_common.core.logging_config import logger
from medicus_common.llm.settings import get_llm_settings

T = TypeVar("T", bound=BaseModel)

_REASONING_PREFIXES = ("gpt-5", "o1", "o3", "o4")


class ModelNotConfiguredError(RuntimeError):
    """Raised when a capability (speech, vision, ...) has no backing model."""


@lru_cache
def get_client() -> AsyncOpenAI:
    """OpenAI SDK client pointed at OpenAI or any OpenAI-compatible server."""
    s = get_llm_settings()
    if s.provider == "litellm":
        raise ModelNotConfiguredError("get_client() is not available with LLM_PROVIDER=litellm")
    api_key = s.resolved_api_key
    if not api_key:
        if s.provider == "openai":
            raise ModelNotConfiguredError("Set LLM_API_KEY (or OPENAI_API_KEY) to use the OpenAI provider")
        api_key = "not-needed"  # local servers such as Ollama ignore the key
    return AsyncOpenAI(api_key=api_key, base_url=s.base_url, timeout=s.timeout_seconds)


def model_name(role: str) -> str:
    return get_llm_settings().model_for(role)


def get_agent_model(role: str) -> Any:
    """Model object for the OpenAI Agents SDK, honouring LLM_PROVIDER."""
    s = get_llm_settings()
    name = s.model_for(role)
    if s.provider == "openai":
        from agents import OpenAIResponsesModel

        return OpenAIResponsesModel(model=name, openai_client=get_client())
    if s.provider == "openai_compatible":
        from agents import OpenAIChatCompletionsModel

        return OpenAIChatCompletionsModel(model=name, openai_client=get_client())
    from agents.extensions.models.litellm_model import LitellmModel

    return LitellmModel(model=name, api_key=s.resolved_api_key, base_url=s.base_url)


def _reasoning_extra(role: str, model: Optional[str] = None) -> dict[str, Any]:
    """`reasoning_effort` for non-OpenAI providers, when LLM_REASONING_EFFORT is set.

    Thinking models served by Ollama, vLLM, LM Studio, OpenRouter... (Qwen3, DeepSeek-R1,
    gpt-oss) accept it on the OpenAI-compatible endpoint. `none` disables thinking, which
    small local models usually need: otherwise hidden reasoning can consume the whole
    output budget and the turn ends with no answer.
    """
    s = get_llm_settings()
    if not s.reasoning_effort or s.provider == "openai":
        return {}
    return {"reasoning_effort": s.reasoning_effort}


def get_model_settings(role: str, *, max_tokens: Optional[int] = None, temperature: Optional[float] = None,
                       tools: bool = False) -> Any:
    """ModelSettings that only include parameters the active provider understands."""
    from agents import ModelSettings

    s = get_llm_settings()
    kwargs: dict[str, Any] = {}
    if max_tokens:
        kwargs["max_tokens"] = max_tokens

    is_openai = s.provider == "openai"
    is_reasoning_model = is_openai and s.model_for(role).startswith(_REASONING_PREFIXES)
    if is_reasoning_model:
        from openai.types.shared import Reasoning

        kwargs["reasoning"] = Reasoning(effort=s.reasoning_effort or "low")
    elif temperature is not None:
        kwargs["temperature"] = temperature
    extra = _reasoning_extra(role)
    if extra:
        kwargs["extra_args"] = extra

    if tools:
        if s.parallel_tool_calls is not None:
            kwargs["parallel_tool_calls"] = s.parallel_tool_calls
        elif is_openai:
            kwargs["parallel_tool_calls"] = True
    return ModelSettings(**kwargs)


# ---------------------------------------------------------------------------
# Chat completions (text, multimodal, structured)
# ---------------------------------------------------------------------------

def text_part(text: str) -> dict:
    return {"type": "text", "text": text}


def image_part(data_url: str) -> dict:
    return {"type": "image_url", "image_url": {"url": data_url}}


def _extract_json(text: str) -> str:
    text = (text or "").strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fenced:
        return fenced.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    return text[start:end + 1] if start != -1 and end > start else text


async def _litellm_completion(role: str, messages: list[dict], **kwargs: Any) -> Any:
    import litellm

    s = get_llm_settings()
    return await litellm.acompletion(
        model=s.model_for(role), messages=messages, api_key=s.resolved_api_key,
        api_base=s.base_url, timeout=s.timeout_seconds, **kwargs,
    )


async def complete(messages: list[dict], *, role: str = "text", model: Optional[str] = None,
                   temperature: Optional[float] = None, json_mode: bool = False) -> str:
    """Single chat completion; returns the assistant text."""
    s = get_llm_settings()
    extra: dict[str, Any] = {}
    if json_mode:
        extra["response_format"] = {"type": "json_object"}
    if temperature is not None and not (s.provider == "openai" and (model or s.model_for(role)).startswith(_REASONING_PREFIXES)):
        extra["temperature"] = temperature
    extra.update(_reasoning_extra(role))

    if s.provider == "litellm":
        response = await _litellm_completion(role, messages, **extra)
    else:
        response = await get_client().chat.completions.create(
            model=model or s.model_for(role), messages=messages, **extra
        )
    return response.choices[0].message.content or ""


async def parse_structured(messages: list[dict], output_model: Type[T], *, role: str = "text",
                           model: Optional[str] = None) -> Optional[T]:
    """
    Ask the model for output matching `output_model`.

    Uses native JSON-schema structured output when the server supports it and
    falls back to JSON mode + schema-in-prompt otherwise (common on local models).
    """
    s = get_llm_settings()
    try:
        if s.provider == "litellm":
            response = await _litellm_completion(role, messages, response_format=output_model, **_reasoning_extra(role))
            return output_model.model_validate_json(_extract_json(response.choices[0].message.content))

        completion = await get_client().chat.completions.parse(
            model=model or s.model_for(role), messages=messages, response_format=output_model,
            **_reasoning_extra(role),
        )
        message = completion.choices[0].message
        if message.parsed is not None:
            return message.parsed
        if message.content:
            return output_model.model_validate_json(_extract_json(message.content))
    except BadRequestError as e:
        logger.info(f"Structured output not supported by provider, using JSON-mode fallback: {e}")
    except Exception as e:
        logger.warning(f"Structured output failed ({type(e).__name__}: {e}); retrying with JSON-mode fallback")

    schema = json.dumps(output_model.model_json_schema())
    fallback = list(messages) + [{
        "role": "system",
        "content": f"Respond with a single JSON object that validates against this JSON Schema, and nothing else:\n{schema}",
    }]
    try:
        raw = await complete(fallback, role=role, model=model, json_mode=True)
        return output_model.model_validate_json(_extract_json(raw))
    except Exception as e:
        logger.error(f"Structured output fallback failed: {e}", exc_info=True)
        return None


# ---------------------------------------------------------------------------
# Speech
# ---------------------------------------------------------------------------

def _audio_client(provider: str, base_url: Optional[str], api_key: Optional[str]) -> AsyncOpenAI:
    s = get_llm_settings()
    if provider == "none":
        raise ModelNotConfiguredError("Speech is disabled. Configure STT_*/TTS_* to enable it.")
    key = api_key or s.resolved_api_key or "not-needed"
    return AsyncOpenAI(api_key=key, base_url=base_url if provider == "openai_compatible" else None,
                       timeout=s.timeout_seconds)


async def transcribe(audio_path: Path) -> str:
    """Speech-to-text via OpenAI or any server implementing /v1/audio/transcriptions."""
    s = get_llm_settings()
    client = _audio_client(s.resolved_stt_provider, s.stt_base_url, s.stt_api_key)
    with open(audio_path, "rb") as audio_file:
        result = await client.audio.transcriptions.create(model=s.stt_model, file=audio_file, response_format="text")
    return (result if isinstance(result, str) else getattr(result, "text", "")).strip()


async def synthesize_speech(text: str, voice: Optional[str] = None) -> bytes:
    """Text-to-speech via OpenAI or any server implementing /v1/audio/speech."""
    s = get_llm_settings()
    client = _audio_client(s.resolved_tts_provider, s.tts_base_url, s.tts_api_key)
    response = await client.audio.speech.create(model=s.tts_model, voice=voice or s.tts_voice, input=text)
    return await response.aread() if hasattr(response, "aread") else await response.read()
