"""Backward-compatible helpers built on the provider-agnostic `medicus_common.llm` package."""

import base64
from typing import AsyncIterator, Optional

from medicus_common.core.logging_config import logger
from medicus_common.llm import get_client, parse_structured, synthesize_speech


class OpenAIClient:
    """Deprecated: use medicus_common.llm.get_client()."""

    def openai_client(self):
        return get_client()


async def llm_parse(model_input: list, output_model, client=None, model=None):
    """Structured output from a list of {role, content} messages (any provider)."""
    return await parse_structured(model_input, output_model, role="summary", model=model)


async def tts_stream(text: str, voice: Optional[str] = None, session_id: Optional[str] = None,
                     client=None, model=None) -> Optional[bytes]:
    if not text or not text.strip():
        return None
    try:
        audio = await synthesize_speech(text, voice)
        logger.info(f"TTS generated for session {session_id}, {len(text)} chars, {len(audio)} bytes")
        return audio
    except Exception as e:
        logger.error(f"TTS generation failed for session {session_id}: {e}", exc_info=True)
        return None


async def tts_stream_chunks(text: str, voice: Optional[str] = None, chunk_size: int = 4096,
                            session_id: Optional[str] = None) -> AsyncIterator[str]:
    audio_bytes = await tts_stream(text, voice, session_id)
    if audio_bytes is None:
        return
    for i in range(0, len(audio_bytes), chunk_size):
        yield base64.b64encode(audio_bytes[i:i + chunk_size]).decode("utf-8")
