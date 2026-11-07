import inspect
import json
from datetime import datetime, timezone
from decimal import Decimal
from http.cookies import SimpleCookie
from typing import Any, Dict, Set

import socketio

from medicus_common.core.config import get_settings
from medicus_common.core.logging_config import logger

from src.services.access import load_owned_conversation
from src.services.auth_service import get_current_user_websocket


async def _maybe_await(result):
    """python-socketio turned some AsyncServer methods into coroutines across 5.x releases."""
    if inspect.isawaitable(result):
        return await result
    return result


def _json_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class _JSON:
    @staticmethod
    def dumps(data, **kwargs):
        return json.dumps(data, default=_json_default, **kwargs)

    loads = staticmethod(json.loads)


class SocketIOManager:
    """
    Real-time delivery of new messages.

    Clients authenticate with their JWT and may only join rooms of conversations
    they own. Server-side code (and the AI service, through the authenticated
    internal HTTP API) publishes with broadcast_to_conversation().
    """

    def __init__(self):
        self.sio = socketio.AsyncServer(
            cors_allowed_origins=get_settings().cors_origins,
            async_mode="asgi",
            json=_JSON,
            ping_timeout=180,
            ping_interval=25,
            max_http_buffer_size=1_000_000,
            compression_threshold=1024,
            logger=False,
            engineio_logger=False,
        )
        # Engine.IO stops allowing same-origin requests once an explicit list is given.
        # Native clients (React Native's WebSocket) send Origin = the server URL, so
        # restore same-origin on top of the configured browser origins.
        self.sio.eio._cors_allowed_origins = self._allowed_origins
        self.conversation_connections: Dict[str, Set[str]] = {}
        self.user_connections: Dict[int, Set[str]] = {}
        self.session_metadata: Dict[str, Dict[str, Any]] = {}
        self._register_handlers()

    @staticmethod
    def _allowed_origins(environ: dict) -> list:
        allowed = list(get_settings().cors_origins)
        host = environ.get("HTTP_X_FORWARDED_HOST") or environ.get("HTTP_HOST")
        if host:
            host = host.split(",")[0].strip()
            scheme = (environ.get("HTTP_X_FORWARDED_PROTO") or environ.get("wsgi.url_scheme") or "http").split(",")[0].strip()
            allowed.append(f"{scheme}://{host}")
        return allowed

    async def _token_from(self, sid: str, data: dict) -> str | None:
        token = data.get("token")
        if token and token != "__cookie__":
            return token
        cookie = SimpleCookie()
        cookie.load(self.sio.get_environ(sid).get("HTTP_COOKIE", ""))
        return cookie["medicus_access"].value if "medicus_access" in cookie else None

    async def _join(self, sid: str, user_id: int, conversation_id: str) -> bool:
        if await load_owned_conversation(conversation_id, user_id) is None:
            return False
        await _maybe_await(self.sio.enter_room(sid, f"conversation_{conversation_id}"))
        self.conversation_connections.setdefault(conversation_id, set()).add(sid)
        self.session_metadata[sid].setdefault("conversations", set()).add(conversation_id)
        return True

    def _register_handlers(self):
        @self.sio.event
        async def authenticate(sid, data):
            data = data or {}
            conversation_id = data.get("conversation_id")
            try:
                token = await self._token_from(sid, data)
                if not token or not conversation_id:
                    raise PermissionError("Authentication and conversation_id required")
                user = await get_current_user_websocket(token)
                self.session_metadata[sid] = {"user_id": user.id, "connected_at": datetime.now(timezone.utc)}
                self.user_connections.setdefault(user.id, set()).add(sid)
                if not await self._join(sid, user.id, str(conversation_id)):
                    raise PermissionError("Conversation not found")
                await self.sio.emit("authenticated", {
                    "user_id": user.id,
                    "conversation_id": conversation_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }, room=sid)
            except Exception as e:
                logger.warning(f"[SOCKET_AUTH] rejected sid={sid}: {type(e).__name__}")
                await self.sio.emit("auth_error", {"message": "Authentication failed"}, room=sid)
                await _maybe_await(self.sio.disconnect(sid))

        @self.sio.event
        async def join_conversation(sid, data):
            session = self.session_metadata.get(sid)
            conversation_id = (data or {}).get("conversation_id")
            if not session or not conversation_id or not await self._join(sid, session["user_id"], str(conversation_id)):
                await self.sio.emit("join_error", {"conversation_id": conversation_id}, room=sid)

        @self.sio.event
        async def ping(sid):
            await self.sio.emit("pong", room=sid)

        @self.sio.event
        async def disconnect(sid):
            await self._unregister_connection(sid)

    async def _unregister_connection(self, sid: str):
        metadata = self.session_metadata.pop(sid, None)
        if not metadata:
            return
        for conversation_id in metadata.get("conversations", set()):
            sids = self.conversation_connections.get(conversation_id, set())
            sids.discard(sid)
            if not sids:
                self.conversation_connections.pop(conversation_id, None)
        sids = self.user_connections.get(metadata["user_id"], set())
        sids.discard(sid)
        if not sids:
            self.user_connections.pop(metadata["user_id"], None)

    async def broadcast_to_conversation(self, conversation_id: str, event_name: str, data: Any):
        await self.sio.emit(event_name, data, room=f"conversation_{conversation_id}")

    async def broadcast_to_user(self, user_id: int, event_name: str, data: Any):
        for sid in list(self.user_connections.get(user_id, set())):
            try:
                await self.sio.emit(event_name, data, room=sid)
            except Exception as e:
                logger.warning(f"Failed to emit to session {sid}: {e}")
                await self._unregister_connection(sid)

    def get_connection_stats(self) -> Dict[str, Any]:
        return {
            "total_connections": len(self.session_metadata),
            "conversations_with_connections": len(self.conversation_connections),
            "users_with_connections": len(self.user_connections),
        }


_manager: SocketIOManager | None = None


def initialize_socketio_manager() -> SocketIOManager:
    global _manager
    if _manager is None:
        _manager = SocketIOManager()
    return _manager


def get_socketio_manager() -> SocketIOManager:
    return initialize_socketio_manager()
