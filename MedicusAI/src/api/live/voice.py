"""
Live voice conversation over a WebSocket, built only on open, self-hostable pieces:

    device mic --(utterance audio)--> speech-to-text (STT_*) --> the conversation's assistant
    (same agent, tools, guardrail and records as text chat) --> text-to-speech (TTS_*) --> device speaker

Any OpenAI-compatible speech server works (Ollama audio models such as lfm3-omni,
faster-whisper, Kokoro, LocalAI...). The device detects the end of each utterance
(silence) and sends it as one message; the reply streams back sentence by sentence
so playback starts before the whole answer is spoken.

Protocol (JSON text frames)
  client -> server
    {"type": "session.start", "token": "<access token>", "convo_id": "<uuid>"}
    {"type": "input_audio", "audio": "<base64>", "format": "m4a"}
    {"type": "response.cancel"}                     barge-in: stop the current answer
  server -> client
    {"type": "session.ready", "assistant": "mediaid"|"medidoc", "voice": "..."}
    {"type": "state", "state": "transcribing"|"thinking"|"speaking"|"listening"}
    {"type": "transcript", "text": "..."}           what the user said
    {"type": "response.text", "text": "..."}        the full answer (also saved to the chat)
    {"type": "response.audio", "seq": 0, "audio": "<base64>", "format": "wav"}
    {"type": "response.done"}
    {"type": "error", "message": "...", "fatal": bool}
"""

import asyncio
import base64
import binascii
import json
import re
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from medicus_common.core.logging_config import logger
from medicus_common.llm import get_llm_settings, synthesize_speech
from medicus_common.models.convo.payload import AppPayload, ConvoStatus

from src.api.auth_dependencies import user_from_token
from src.api.route import _trusted_payload
from src.handlers.helpers.medivox.transcribe_audio import MAX_AUDIO_BYTES, transcribe_bytes
from src.handlers.meditext import meditext_handler
from src.security.scope import resolve_chat_scope

router = APIRouter()

AUTH_TIMEOUT_SECONDS = 15
MAX_FRAME_CHARS = (MAX_AUDIO_BYTES * 4) // 3 + 1024   # base64 of the largest accepted clip
ALLOWED_FORMATS = {"m4a", "mp4", "aac", "wav", "webm", "ogg", "mp3", "3gp", "caf"}
NOT_HEARD = "Sorry, I didn't catch that. Could you say it again?"
FAILED = "Sorry, something went wrong on my side. Please try again."


def live_voice_status() -> Optional[str]:
    """None when live voice can run; otherwise why not (shown to the user)."""
    s = get_llm_settings()
    if s.resolved_stt_provider == "none":
        return "Live voice needs a speech-to-text server. Set STT_BASE_URL and STT_MODEL."
    if s.resolved_tts_provider == "none":
        return "Live voice needs a text-to-speech server. Set TTS_BASE_URL and TTS_MODEL."
    return None


# ---------------------------------------------------------------------------
# Text shaping for speech
# ---------------------------------------------------------------------------

_MD = [
    (re.compile(r"```.*?```", re.S), " "),
    (re.compile(r"^[\s|:-]*-{3,}[\s|:-]*$", re.M), ""),     # table dividers and horizontal rules
    (re.compile(r"!\[[^\]]*\]\([^)]*\)"), " "),
    (re.compile(r"\[([^\]]+)\]\([^)]*\)"), r"\1"),
    (re.compile(r"^\s{0,3}#{1,6}\s*", re.M), ""),
    (re.compile(r"^\s*[-*+•]\s+", re.M), ""),
    (re.compile(r"^\s*\d+[.)]\s+", re.M), ""),
    (re.compile(r"[*_`~>|]+"), ""),
    (re.compile(r"([.:;,!?])\s*\n+\s*"), r"\1 "),     # the line already ends a clause
    (re.compile(r"\s*\n+\s*"), ". "),
]


def speakable(text: str) -> str:
    """Markdown answer -> plain sentences a voice can read."""
    for pattern, repl in _MD:
        text = pattern.sub(repl, text)
    text = re.sub(r"\.\s*\.", ".", text)
    return re.sub(r"\s{2,}", " ", text).strip(" .") + "."


def sentence_chunks(text: str, min_chars: int = 40, max_chars: int = 260) -> list[str]:
    """Split into sentence-sized chunks: short ones are merged so each request is worth a round trip."""
    # Sentence ends, except after titles such as "Dr." so names stay in one chunk.
    sentences = re.split(r"(?<!\bDr\.)(?<!\bMr\.)(?<!\bMs\.)(?<!\bMrs\.)(?<!\bSt\.)(?<=[.!?])\s+(?=[A-Z0-9\"'(])", text)
    chunks: list[str] = []
    for s in (x.strip() for x in sentences):
        if not s:
            continue
        if chunks and (len(chunks[-1]) < min_chars or len(chunks[-1]) + len(s) < min_chars * 2) \
                and len(chunks[-1]) + len(s) <= max_chars:
            chunks[-1] = f"{chunks[-1]} {s}"
        else:
            chunks.append(s)
    return chunks


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

class LiveSession:
    def __init__(self, ws: WebSocket):
        self.ws = ws
        self.scope = None
        self.turn: Optional[asyncio.Task] = None
        self.send_lock = asyncio.Lock()

    async def send(self, **message) -> None:
        async with self.send_lock:
            await self.ws.send_json(message)

    async def state(self, state: str) -> None:
        await self.send(type="state", state=state)

    async def authenticate(self) -> bool:
        try:
            first = await asyncio.wait_for(self.ws.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
        except (asyncio.TimeoutError, ValueError):
            await self.send(type="error", message="Expected session.start", fatal=True)
            return False
        if not isinstance(first, dict) or first.get("type") != "session.start":
            await self.send(type="error", message="Expected session.start", fatal=True)
            return False
        try:
            user = user_from_token(str(first.get("token") or ""))
            self.scope = await resolve_chat_scope(user, first.get("convo_id"))
        except HTTPException as e:
            await self.send(type="error", message=str(e.detail), fatal=True)
            return False
        problem = live_voice_status()
        if problem:
            await self.send(type="error", message=problem, fatal=True)
            return False
        await self.send(type="session.ready", assistant=self.scope.assistant, voice=get_llm_settings().tts_voice)
        logger.info(f"[LIVE] session started convo={self.scope.conversation_id[:8]} "
                    f"assistant={self.scope.assistant} actor={self.scope.actor_role}")
        return True

    async def cancel_turn(self) -> None:
        if self.turn and not self.turn.done():
            self.turn.cancel()
            try:
                await self.turn
            except (asyncio.CancelledError, Exception):
                pass
        self.turn = None

    async def run_turn(self, audio: bytes, fmt: str) -> None:
        t0 = time.time()
        try:
            await self.state("transcribing")
            try:
                text = (await transcribe_bytes(audio, f".{fmt}")).strip()
            except Exception as e:
                logger.warning(f"[LIVE] transcription failed: {e}")
                text = ""
            t_stt = time.time() - t0
            await self.send(type="transcript", text=text)
            if len(text) < 2:
                await self.speak(NOT_HEARD)
                return

            await self.state("thinking")
            answer = await self.answer(text)
            t_llm = time.time() - t0 - t_stt
            await self.send(type="response.text", text=answer)

            await self.speak(answer)
            logger.info(f"[LIVE] turn done: stt {t_stt:.1f}s, assistant {t_llm:.1f}s, total {time.time() - t0:.1f}s")
        except asyncio.CancelledError:
            logger.info("[LIVE] turn cancelled by the user")
            raise
        except WebSocketDisconnect:
            raise
        except Exception as e:
            logger.error(f"[LIVE] turn failed: {e}", exc_info=True)
            await self.send(type="error", message=FAILED, fatal=False)
            await self.send(type="response.done")
            await self.state("listening")

    async def answer(self, text: str) -> str:
        """Run the conversation's assistant on the transcript, exactly like a typed message:
        same tools and guardrail, and both messages are saved and broadcast to the chat."""
        payload = AppPayload(text_io=text, convo_id=self.scope.conversation_id,
                             assistant=self.scope.assistant, convo_status=ConvoStatus.INACTIVE)
        # INACTIVE: history comes from the database, so earlier typed and spoken turns are included.
        payload = await _trusted_payload(payload, self.scope)
        model_role = "voice" if get_llm_settings().model_voice else None
        result, _ = await meditext_handler(payload, model_role=model_role)
        if result.status_code != 200 or not result.text_io:
            logger.warning(f"[LIVE] assistant returned {result.status_code}: {result.message}")
            return FAILED
        return result.text_io

    async def speak(self, text: str) -> None:
        """Synthesize sentence by sentence and stream each clip as soon as it is ready."""
        fmt = get_llm_settings().tts_format
        await self.state("speaking")
        for seq, chunk in enumerate(sentence_chunks(speakable(text))):
            audio = await synthesize_speech(chunk)
            await self.send(type="response.audio", seq=seq, audio=base64.b64encode(audio).decode("ascii"),
                            format=fmt, text=chunk)
        await self.send(type="response.done")
        await self.state("listening")

    async def handle(self, message: dict) -> None:
        kind = message.get("type")
        if kind == "response.cancel":
            await self.cancel_turn()
            await self.send(type="response.done")
            await self.state("listening")
        elif kind == "input_audio":
            fmt = str(message.get("format") or "m4a").lower().lstrip(".")
            if fmt not in ALLOWED_FORMATS:
                await self.send(type="error", message=f"Unsupported audio format: {fmt}", fatal=False)
                return
            try:
                audio = base64.b64decode(str(message.get("audio") or ""), validate=True)
            except (binascii.Error, ValueError):
                await self.send(type="error", message="Audio is not valid base64", fatal=False)
                return
            if not audio:
                return
            await self.cancel_turn()          # a new utterance interrupts the previous answer
            self.turn = asyncio.create_task(self.run_turn(audio, fmt))
        elif kind == "ping":
            await self.send(type="pong")


@router.websocket("/live/voice")
async def live_voice(ws: WebSocket):
    await ws.accept()
    session = LiveSession(ws)
    try:
        if not await session.authenticate():
            await ws.close(code=1008)
            return
        while True:
            raw = await ws.receive_text()
            if len(raw) > MAX_FRAME_CHARS:
                await session.send(type="error", message="Audio clip too large", fatal=False)
                continue
            try:
                message = json.loads(raw)
            except ValueError:
                continue
            if isinstance(message, dict):
                await session.handle(message)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[LIVE] session error: {e}", exc_info=True)
    finally:
        await session.cancel_turn()
        if session.scope:
            logger.info(f"[LIVE] session ended convo={session.scope.conversation_id[:8]}")


@router.get("/live/status")
async def live_status():
    """Whether this server can run live voice (no auth: it reveals only configuration state)."""
    problem = live_voice_status()
    return {"available": problem is None, "reason": problem}
