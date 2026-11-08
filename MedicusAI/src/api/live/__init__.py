"""Live voice conversations (speech-to-text -> assistant -> text-to-speech) over a WebSocket."""

from src.api.live.voice import router as live_router

__all__ = ["live_router"]
