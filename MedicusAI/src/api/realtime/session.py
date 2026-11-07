"""
WebRTC voice sessions (OpenAI Realtime API; enable with REALTIME_ENABLED=true).

Flow:
  1. /realtime/token -> server builds context and obtains an ephemeral OpenAI token
  2. /realtime/sdp   -> server proxies the SDP offer/answer to OpenAI
  3. The device then talks to OpenAI directly over WebRTC.
"""

import asyncio

import httpx
from fastapi import APIRouter, Depends, HTTPException

from medicus_common.core.logging_config import logger
from medicus_common.llm import get_llm_settings
from medicus_common.models.convo.payload import ConvoStatus
from medicus_common.models.convo.realtime import (
    RealtimeTokenRequest,
    RealtimeTokenResponse,
    SDPRequest,
    SDPResponse,
)
from medicus_common.models.user.user_core import User

from src.api.auth_dependencies import get_current_user
from src.handlers.helpers.common.agent_helper import build_convo_context
from src.security.scope import resolve_chat_scope
from src.services.doctor.doctor_context import get_doctor_context
from src.services.patient.patient_context import get_patient_context
from src.services.session.convo_service import ConvoService
from src.utils.tools_config import get_agent_tools

router = APIRouter()

OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime"

_VOICE_GUIDELINES = """

VOICE CONVERSATION GUIDELINES:
- Speak naturally and conversationally
- Keep responses concise (2-3 sentences when possible)
- Use simple language, avoid medical jargon unless necessary
- Confirm understanding before taking actions
- If interrupted, acknowledge and address the new input"""


def _require_realtime() -> str:
    s = get_llm_settings()
    if not s.realtime_enabled:
        raise HTTPException(status_code=404, detail="Realtime voice is not enabled on this server")
    if not s.resolved_api_key:
        raise HTTPException(status_code=503, detail="Realtime voice requires an OpenAI API key")
    return s.resolved_api_key


@router.post("/realtime/token", response_model=RealtimeTokenResponse)
async def create_realtime_token(request: RealtimeTokenRequest, current_user: User = Depends(get_current_user)):
    """Create a Realtime session pre-loaded with the conversation's context."""
    api_key = _require_realtime()
    scope = await resolve_chat_scope(current_user, request.convo_id)
    if scope.assistant != "medidoc":
        raise HTTPException(status_code=400, detail="Realtime voice is available to doctors only")

    history_result, doctor_context, patient_context = await asyncio.gather(
        ConvoService.load_history(scope.conversation_id, ConvoStatus.ACTIVE.value),
        get_doctor_context(doctor_id=scope.doctor_id) if scope.doctor_id else asyncio.sleep(0, result=None),
        get_patient_context(patient_id=scope.patient_id) if scope.patient_id else asyncio.sleep(0, result=None),
        return_exceptions=True,
    )
    history = [] if isinstance(history_result, Exception) else history_result[0]
    doctor_context = None if isinstance(doctor_context, Exception) else doctor_context
    patient_context = None if isinstance(patient_context, Exception) else patient_context

    system_message = build_convo_context(
        patient_context=patient_context,
        doctor_context=doctor_context,
        convo_context={"recent_messages": history, "compact_summary": None, "conversation_id": scope.conversation_id},
        assistant=scope.assistant,
    )
    instructions = system_message.get("content", "") + _VOICE_GUIDELINES
    settings = get_llm_settings()

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{OPENAI_REALTIME_URL}/sessions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.realtime_model,
                "voice": settings.tts_voice,
                "instructions": instructions,
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {"model": settings.stt_model},
                "turn_detection": {"type": "server_vad", "threshold": 0.5,
                                   "prefix_padding_ms": 300, "silence_duration_ms": 700},
                "tools": get_agent_tools(assistant=scope.assistant, patient_id=scope.patient_id),
                "tool_choice": "auto",
            },
        )
    if response.status_code != 200:
        logger.error(f"[REALTIME] OpenAI error {response.status_code}: {response.text}")
        raise HTTPException(status_code=502, detail="Failed to create realtime session")

    data = response.json()
    return RealtimeTokenResponse(
        client_secret=data["client_secret"]["value"],
        session_id=data.get("id", scope.conversation_id),
        model=settings.realtime_model,
        voice=settings.tts_voice,
        instructions=instructions[:500] + "..." if len(instructions) > 500 else instructions,
    )


@router.post("/realtime/sdp", response_model=SDPResponse)
async def proxy_sdp_exchange(request: SDPRequest, current_user: User = Depends(get_current_user)):
    """Proxy the SDP exchange (some mobile builds cannot reach api.openai.com directly)."""
    _require_realtime()
    if not request.token or not request.sdp:
        raise HTTPException(status_code=400, detail="Missing ephemeral token or SDP offer")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENAI_REALTIME_URL,
                params={"model": get_llm_settings().realtime_model},
                headers={"Authorization": f"Bearer {request.token}", "Content-Type": "application/sdp"},
                content=request.sdp,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Realtime SDP exchange timed out")
    except httpx.HTTPError as e:
        logger.error(f"[REALTIME] SDP exchange network error: {e}")
        raise HTTPException(status_code=502, detail="Realtime SDP exchange failed")

    if response.status_code not in (200, 201):
        logger.error(f"[REALTIME] SDP exchange failed {response.status_code}: {response.text}")
        raise HTTPException(status_code=502, detail="Realtime SDP exchange failed")
    return SDPResponse(sdp=response.text)
