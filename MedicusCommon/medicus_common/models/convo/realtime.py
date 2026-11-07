# =============================================================================
# medicus_common/models/convo/realtime.py
# =============================================================================
"""
Pydantic models for OpenAI Realtime API (WebRTC voice conversations).

These models support real-time voice conversations with Sara AI using
WebRTC and OpenAI's Realtime API with semantic VAD.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel

# =============================================================================
# Request Models
# =============================================================================
class RealtimeTokenRequest(BaseModel):
    """Request for ephemeral token with full context."""
    convo_id: str
    assistant: str = "mediaid"  # 'mediaid' or 'medidoc'
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    user_id: Optional[int] = None
    sender_id: Optional[int] = None

class SDPRequest(BaseModel):
    """SDP offer from client for WebRTC negotiation."""
    sdp: str
    token: str
    model: str

class ToolCallRequest(BaseModel):
    """Tool execution request from WebRTC client."""
    tool_name: str
    arguments: Dict[str, Any]
    convo_id: str
    assistant: str = "mediaid"
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    user_id: Optional[int] = None
    sender_id: Optional[int] = None

class TranscriptMessage(BaseModel):
    """Single message transcript from WebRTC conversation."""
    role: str  # 'user' or 'assistant'
    text: str
    timestamp: str  # ISO 8601 format

class SaveTranscriptsRequest(BaseModel):
    """Request to save WebRTC conversation transcripts."""
    convo_id: str
    messages: list[TranscriptMessage]
    assistant: str = "mediaid"
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    user_id: Optional[int] = None
    sender_id: Optional[int] = None

# =============================================================================
# Response Models
# =============================================================================

class RealtimeTokenResponse(BaseModel):
    """Ephemeral token for direct OpenAI Realtime connection."""
    client_secret: str
    session_id: str
    model: str
    voice: str
    instructions: str  # For debugging/display

class SDPResponse(BaseModel):
    """SDP answer from OpenAI."""
    sdp: str