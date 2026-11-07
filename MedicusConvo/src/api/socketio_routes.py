# =============================================================================
# src/api/socketio_routes.py
"""Socket.IO API routes for broadcasting messages."""

import hmac
import os
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Dict, Any
import structlog

from src.services.socketio_service import get_socketio_manager

logger = structlog.get_logger()
router = APIRouter(prefix="/internal/socketio", tags=["socketio"])

_internal_key_header = APIKeyHeader(name="X-Internal-Key", auto_error=False)


async def verify_internal_key(key: str = Security(_internal_key_header)) -> None:
    """Verify X-Internal-Key header for internal service-to-service calls."""
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or expected.upper().startswith("CHANGE_ME"):
        logger.error("INTERNAL_API_KEY env var is not set â€” rejecting all internal requests")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service misconfigured")
    if not key or not hmac.compare_digest(key.encode(), expected.encode()):
        logger.warning("Internal route rejected: invalid or missing X-Internal-Key")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


class BroadcastRequest(BaseModel):
    """Request model for broadcasting messages."""
    event: str
    data: Dict[str, Any]


from uuid import UUID


def is_valid_uuid(val: str) -> bool:
    """Check if a string is a valid UUID."""
    try:
        UUID(str(val))
        return True
    except ValueError:
        return False


@router.post("/broadcast/{conversation_id}")
async def broadcast_to_conversation(conversation_id: str, request: BroadcastRequest, _: None = Depends(verify_internal_key)):
    """Broadcast message to all users in a conversation via Socket.IO."""
    try:
        # Validate conversation_id is a UUID
        if not is_valid_uuid(conversation_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid conversation_id: must be a valid UUID"
            )

        # Get Socket.IO manager
        manager = get_socketio_manager()

        await manager.broadcast_to_conversation(
            conversation_id=conversation_id,
            event_name=request.event,
            data=request.data
        )

        return {
            "success": True,
            "message": "Message broadcasted successfully",
            "conversation_id": conversation_id,
            "event": request.event,
            "stats": manager.get_connection_stats()
        }

    except Exception as e:
        logger.error("âŒ Failed to broadcast Socket.IO message",
                    conversation_id=conversation_id[:8],
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to broadcast message"
        )


@router.post("/broadcast/user/{user_id}")
async def broadcast_to_user(user_id: int, request: BroadcastRequest, _: None = Depends(verify_internal_key)):
    """Broadcast message to all connections for a specific user via Socket.IO."""
    try:
        # Get Socket.IO manager
        manager = get_socketio_manager()

        await manager.broadcast_to_user(
            user_id=user_id,
            event_name=request.event,
            data=request.data
        )

        return {
            "success": True,
            "message": "Message broadcasted to user successfully",
            "user_id": user_id,
            "event": request.event,
            "stats": manager.get_connection_stats()
        }

    except Exception as e:
        logger.error("âŒ Failed to broadcast Socket.IO message to user",
                    user_id=user_id,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to broadcast message"
        )


@router.get("/stats")
async def get_connection_stats(_: None = Depends(verify_internal_key)):
    """Get current Socket.IO connection statistics."""
    try:
        # Get Socket.IO manager
        manager = get_socketio_manager()

        stats = manager.get_connection_stats()
        return {
            "success": True,
            "stats": stats
        }

    except Exception as e:
        logger.error("âŒ Failed to get Socket.IO stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get stats"
        )