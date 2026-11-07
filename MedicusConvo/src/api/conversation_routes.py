from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from medicus_common.core.exceptions import DatabaseError
from medicus_common.core.database import db_manager
from medicus_common.core.logging_config import logger
from medicus_common.models.convo.convo_core import UrgencyLevel
from medicus_common.models.convo.convo_requests import ConversationCreateRequest
from medicus_common.models.convo.convo_responses import (
    ConversationContext,
    ConversationHead,
    ConversationListResponse,
    ConversationSummary,
)
from medicus_common.models.user.user_core import UserRole

from src.services.access import OwnedConversation, owned_conversation
from src.services.auth_service import get_current_user
from src.services.conversation_service import ConversationExistsError, convo_service

router = APIRouter(prefix="/conversations", tags=["conversations"])

Assistant = Literal["mediaid", "medidoc"]


def _default_assistant(user) -> str:
    role = getattr(user, "role", None)
    return "medidoc" if role == UserRole.DOCTOR or str(role).lower().endswith("doctor") else "mediaid"


@router.get("/", response_model=ConversationListResponse)
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    patient_id: Optional[int] = Query(None, description="Filter by patient context"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor context"),
    assistant: Optional[Assistant] = Query(None, description="Defaults to medidoc for doctors, mediaid otherwise"),
    user=Depends(get_current_user),
) -> ConversationListResponse:
    """List the caller's own conversations (always filtered by owner)."""
    try:
        return await convo_service.list_conversations(
            user=user, page=page, page_size=page_size,
            patient_id=patient_id, doctor_id=doctor_id, assistant=assistant or _default_assistant(user),
        )
    except Exception:
        logger.exception("Error listing conversations")
        raise HTTPException(status_code=500, detail="Failed to list conversations")


@router.get("/search", response_model=ConversationListResponse)
async def search_conversations(
    q: str = Query(..., min_length=1, max_length=200),
    mode: Literal["participant", "content"] = Query("participant"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    patient_id: Optional[int] = Query(None),
    doctor_id: Optional[int] = Query(None),
    assistant: Optional[Assistant] = Query(None, description="Defaults to medidoc for doctors, mediaid otherwise"),
    user=Depends(get_current_user),
) -> ConversationListResponse:
    try:
        return await convo_service.search_conversations(
            user=user, q=q, mode=mode, assistant=assistant or _default_assistant(user),
            patient_id=patient_id, doctor_id=doctor_id, page=page, page_size=page_size,
        )
    except Exception:
        logger.exception("Error searching conversations")
        raise HTTPException(status_code=500, detail="Failed to search conversations")


@router.get("/{convo_id}/", response_model=ConversationHead)
async def get_conversation(convo: OwnedConversation = Depends(owned_conversation)) -> ConversationHead:
    conversation = await convo_service.get_conversation_by_id(convo.id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/", response_model=ConversationHead, status_code=status.HTTP_201_CREATED)
async def create_conversation(req: ConversationCreateRequest, user=Depends(get_current_user)) -> ConversationHead:
    try:
        return await convo_service.create_conversation(req, user)
    except ConversationExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conversation already exists")
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError:
        logger.exception("Database error creating conversation")
        raise HTTPException(status_code=500, detail="Failed to create conversation")


@router.get("/{convo_id}/context", response_model=ConversationContext)
async def get_conversation_context(convo: OwnedConversation = Depends(owned_conversation)) -> ConversationContext:
    """AI memory state for the conversation (compaction + domain summaries)."""
    context = await convo_service.get_conversation_context(convo.id)
    if context is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return context


@router.get("/{convo_id}/summary", response_model=ConversationSummary)
async def get_conversation_summary(
    convo: OwnedConversation = Depends(owned_conversation), user=Depends(get_current_user)
) -> ConversationSummary:
    if user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can view conversation summaries")
    # MediBrief summaries are generated by the AI service (medibrief_summarize tool)
    # and stored against either side of the patient<->doctor thread.
    row = await db_manager.fetchrow(
        """
        SELECT s.summary_text, s.created_at,
               (SELECT count(*) FROM dialog.messages m WHERE m.conversation_id = ANY($1::uuid[])) AS message_count
        FROM dialog.medibrief_summaries s
        WHERE s.conversation_id = ANY($1::uuid[]) OR s.mirror_conversation_id = ANY($1::uuid[])
        ORDER BY s.created_at DESC
        LIMIT 1
        """,
        convo.visible_ids,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="No summary has been generated for this conversation yet")
    return ConversationSummary(
        conversation_id=convo.id,
        summary_text=row["summary_text"],
        key_symptoms=[],
        urgency_level=UrgencyLevel.LOW,
        message_count=row["message_count"],
        generated_at=row["created_at"],
    )
