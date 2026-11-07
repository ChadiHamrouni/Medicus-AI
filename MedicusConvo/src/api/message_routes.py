from datetime import datetime
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import Response

from medicus_common.core.logging_config import logger
from medicus_common.models.convo.convo_records import Message
from medicus_common.models.convo.convo_requests import MessageCreateRequest
from medicus_common.models.convo.convo_responses import MessagePaginatedResponse
from medicus_common.storage import (
    get_storage,
    get_storage_settings,
    guess_content_type,
    normalize_key,
    sign_key,
    verify_signed_key,
)
from medicus_common.storage.access import user_can_read_object

from src.services.access import OwnedConversation, owned_conversation
from src.services.auth_service import get_current_user
from src.services.message_service import AttachmentNotAllowed, message_service

router = APIRouter(prefix="/conversations", tags=["messages"])
media_router = APIRouter(prefix="/media", tags=["media"])

MAX_FILES_PER_MESSAGE = 10
SIGNED_URL_TTL_SECONDS = 600
ALLOWED_FILE_TYPES = {
    "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm", "audio/x-m4a", "audio/m4a", "audio/aac",
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
    "application/pdf", "text/plain",
}


async def _read_upload(file: UploadFile) -> tuple[bytes, str, str]:
    max_bytes = get_storage_settings().max_upload_bytes
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail=f"File type '{content_type}' is not supported")
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File too large (max {max_bytes // (1024 * 1024)}MB)")
    return data, file.filename or "file", content_type


async def _authorized_media_key(raw_key: str, convo: OwnedConversation, user) -> str:
    try:
        key = normalize_key(raw_key)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid media reference")
    if not await user_can_read_object(user.id, key, convo.visible_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found")
    return key


def _signed_url(request: Request, key: str) -> str:
    signature, expires = sign_key(key, SIGNED_URL_TTL_SECONDS)
    base = str(request.url_for("get_signed_media"))
    return f"{base}?key={quote(key, safe='')}&expires={expires}&signature={signature}"


async def _media_response(key: str) -> Response:
    data = await get_storage().get(key)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found")
    return Response(
        content=data,
        media_type=guess_content_type(key),
        headers={"Content-Disposition": "inline", "Cache-Control": "private, max-age=300",
                 "X-Content-Type-Options": "nosniff"},
    )


@router.get("/{convo_id}/messages", response_model=MessagePaginatedResponse)
async def get_messages(
    since: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    convo: OwnedConversation = Depends(owned_conversation),
) -> MessagePaginatedResponse:
    return await message_service.get_messages(convo, since, page, page_size)


@router.post("/{convo_id}/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message(
    req: MessageCreateRequest,
    convo: OwnedConversation = Depends(owned_conversation),
    user=Depends(get_current_user),
) -> Message:
    try:
        return await message_service.send_message(convo, req, user)
    except AttachmentNotAllowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Attachment not accessible")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.post("/{convo_id}/messages/upload", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message_with_file(
    file: UploadFile = File(...),
    message_text: Optional[str] = Form(""),
    convo: OwnedConversation = Depends(owned_conversation),
    user=Depends(get_current_user),
) -> Message:
    data, filename, content_type = await _read_upload(file)
    return await message_service.send_message_with_media(convo, user, message_text or "", data, filename, content_type)


@router.post("/{convo_id}/messages/upload-multiple", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message_with_multiple_files(
    files: list[UploadFile] = File(...),
    message_text: Optional[str] = Form(""),
    convo: OwnedConversation = Depends(owned_conversation),
    user=Depends(get_current_user),
) -> Message:
    if not files or len(files) > MAX_FILES_PER_MESSAGE:
        raise HTTPException(status_code=400, detail=f"Send between 1 and {MAX_FILES_PER_MESSAGE} files")
    attachments = [await _read_upload(f) for f in files]
    return await message_service.send_message_with_multiple_attachments(convo, user, message_text or "", attachments)


@router.get("/{convo_id}/media/{media_key:path}/stream")
async def stream_media(media_key: str, convo: OwnedConversation = Depends(owned_conversation),
                       user=Depends(get_current_user)):
    """Authenticated download of an attachment or vault document visible in this conversation."""
    key = await _authorized_media_key(media_key, convo, user)
    return await _media_response(key)


@router.get("/{convo_id}/media/{media_key:path}/url")
async def get_media_url(media_key: str, request: Request, convo: OwnedConversation = Depends(owned_conversation),
                        user=Depends(get_current_user)):
    """Short-lived signed link, for viewers that cannot send an Authorization header."""
    key = await _authorized_media_key(media_key, convo, user)
    return {"media_sid": key, "url": _signed_url(request, key), "conversation_id": convo.id,
            "expires_in_seconds": SIGNED_URL_TTL_SECONDS}


@router.get("/{convo_id}/messages/{message_id}/media/url")
async def get_message_media_url(message_id: int, request: Request,
                                convo: OwnedConversation = Depends(owned_conversation)):
    key = await message_service.get_message_media_key(convo, message_id)
    if key is None:
        raise HTTPException(status_code=404, detail="No media attached to this message")
    return {"message_id": message_id, "url": _signed_url(request, key), "conversation_id": convo.id,
            "expires_in_seconds": SIGNED_URL_TTL_SECONDS}


@media_router.get("/signed", name="get_signed_media")
async def get_signed_media(key: str, expires: int, signature: str):
    """Serve an object for a valid, unexpired signature (see /media/.../url)."""
    try:
        valid = verify_signed_key(key, signature, expires)
    except RuntimeError:
        logger.error("Signed media requested but no signing secret is configured")
        valid = False
    if not valid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Link expired or invalid")
    return await _media_response(key)
