"""Push AI messages to clients through MedicusConvo's authenticated internal broadcast API."""

import asyncio
import os
from typing import Any, Dict, Optional

import httpx

from medicus_common.core.logging_config import logger


class SocketIOBroadcastService:
    """Calls POST {CONVO_SERVICE_URL}/api/MedicusConvo/internal/socketio/broadcast/{id} with X-Internal-Key."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def _base_url(self) -> str:
        return os.getenv("CONVO_SERVICE_URL", "http://localhost:8003").rstrip("/")

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    async def _broadcast(self, conversation_id: str, event: str, data: Dict[str, Any]) -> bool:
        key = os.getenv("INTERNAL_API_KEY")
        if not key:
            logger.warning("[WS] INTERNAL_API_KEY not set; skipping realtime broadcast")
            return False
        url = f"{self._base_url}/api/MedicusConvo/internal/socketio/broadcast/{conversation_id}"
        for attempt in range(3):
            try:
                response = await self._http().post(
                    url, json={"event": event, "data": data}, headers={"X-Internal-Key": key}
                )
                if response.status_code == 200:
                    return True
                logger.warning(f"[WS] Broadcast rejected ({response.status_code}) for {conversation_id[:8]}")
                return False
            except httpx.HTTPError as e:
                logger.warning(f"[WS] Broadcast attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(1 + attempt)
        return False

    async def broadcast_ai_message(self, conversation_id: str, message_data: Dict[str, Any]) -> bool:
        data = {
            **message_data,
            "timestamp": message_data.get("created_at"),
            "type": "ai_response",
            "conversation_id": conversation_id,
        }
        return await self._broadcast(conversation_id, "new_message", data)

    async def broadcast_compaction_complete(self, conversation_id: str, compact_to_message: int,
                                            compact_summary: str) -> bool:
        return await self._broadcast(conversation_id, "compaction_complete", {
            "type": "compaction_complete",
            "conversation_id": conversation_id,
            "compact_to_message": compact_to_message,
            "compact_summary": compact_summary,
        })

    async def disconnect(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None


socketio_broadcast_service = SocketIOBroadcastService()
