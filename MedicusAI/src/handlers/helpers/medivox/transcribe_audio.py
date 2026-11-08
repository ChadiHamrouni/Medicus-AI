import os
import tempfile
from pathlib import Path

from medicus_common.core.logging_config import logger
from medicus_common.llm import transcribe
from medicus_common.storage import get_storage

try:
    from pydub import AudioSegment
except ImportError:  # optional: only used to normalise audio before transcription
    AudioSegment = None

MAX_AUDIO_BYTES = 25 * 1024 * 1024


async def transcribe_audio(storage_key: str) -> str:
    """Download a voice note from object storage and transcribe it (any STT provider)."""
    data = await get_storage().get(storage_key)
    if data is None:
        raise FileNotFoundError(f"Audio not found: {storage_key}")
    return await transcribe_bytes(data, Path(storage_key).suffix or ".m4a")


async def transcribe_bytes(data: bytes, suffix: str = ".m4a") -> str:
    """Transcribe raw audio (any container ffmpeg reads) with the configured STT server."""
    if len(data) > MAX_AUDIO_BYTES:
        raise ValueError("Audio file too large (max 25MB)")

    paths: list[Path] = []
    try:
        fd, raw_path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        audio_path = Path(raw_path)
        paths.append(audio_path)

        # Mono 16 kHz WAV is the one input every STT server accepts (Whisper servers decode
        # anything via ffmpeg; Ollama audio models such as LFM3 expect 16 kHz WAV). Always
        # convert, so quiet recordings are not sent as raw .m4a.
        if AudioSegment is not None:
            try:
                audio = AudioSegment.from_file(str(audio_path))
                wav_path = audio_path.with_suffix(".processed.wav")
                audio.set_channels(1).set_frame_rate(16000).set_sample_width(2).export(wav_path, format="wav")
                paths.append(wav_path)
                audio_path = wav_path
            except Exception as e:
                logger.warning(f"[MEDIVOX] Audio normalisation skipped: {e}")

        return await transcribe(audio_path)
    finally:
        for p in paths:
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass
