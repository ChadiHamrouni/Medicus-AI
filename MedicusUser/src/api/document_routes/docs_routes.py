"""Document vault API: upload, list, share, revoke, rename, delete, download."""

from typing import Literal, Optional
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from medicus_common.core.logging_config import logger
from medicus_common.models.user import User
from medicus_common.storage import get_storage, guess_content_type, sign_key, verify_signed_key

from src.api.auth_routes.auth_login import get_current_user
from src.helpers.access import owns, owns_document
from src.services.storage import storage_service as vault

router = APIRouter(prefix="/docs", tags=["Document Vault"])

MAX_FILE_SIZE = 10 * 1024 * 1024
DOWNLOAD_LINK_TTL_SECONDS = 600
ALLOWED_FILE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "application/pdf"}

OwnerType = Literal["patient", "doctor"]
_NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")


class DocumentShareRequest(BaseModel):
    doc_external_id: UUID
    conversation_id: UUID
    owner_type: OwnerType


class DocumentRenameRequest(BaseModel):
    original_name: str = Field(..., min_length=1, max_length=255)
    owner_type: OwnerType


async def _require_owner(user: User, owner_type: OwnerType, owner_id: int) -> None:
    if not await owns(user, owner_type, owner_id):
        raise _NOT_FOUND


async def _require_document_owner(user: User, owner_type: OwnerType, doc_external_id: UUID) -> None:
    if not await owns_document(user, owner_type, str(doc_external_id)):
        raise _NOT_FOUND


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    owner_type: OwnerType = Form(...),
    owner_id: int = Form(...),
    current_user: User = Depends(get_current_user),
):
    await _require_owner(current_user, owner_type, owner_id)
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail=f"File type '{file.content_type}' not supported")
    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB")
    try:
        return await vault.upload_document(owner_id, owner_type, content, file.filename or "document", file.content_type)
    except Exception:
        logger.exception("Vault upload failed")
        raise HTTPException(status_code=500, detail="Failed to upload document")


@router.post("/share")
async def share_document(body: DocumentShareRequest, current_user: User = Depends(get_current_user)):
    await _require_document_owner(current_user, body.owner_type, body.doc_external_id)
    try:
        await vault.share_document(str(body.doc_external_id), str(body.conversation_id), body.owner_type, current_user.id)
    except ValueError:
        raise _NOT_FOUND
    return {"status": "shared"}


@router.get("/vault/{owner_type}/{owner_id}")
async def get_vault(owner_type: OwnerType, owner_id: int, current_user: User = Depends(get_current_user)):
    await _require_owner(current_user, owner_type, owner_id)
    return {"documents": await vault.get_vault_docs(owner_id, owner_type)}


@router.get("/shared/{owner_type}/{owner_id}")
async def get_shared(owner_type: OwnerType, owner_id: int, current_user: User = Depends(get_current_user)):
    await _require_owner(current_user, owner_type, owner_id)
    return {"documents": await vault.get_shared_docs(owner_id, owner_type)}


@router.get("/{doc_external_id}/shares")
async def get_document_shares(doc_external_id: UUID, owner_type: OwnerType = Query("patient"),
                              current_user: User = Depends(get_current_user)):
    await _require_document_owner(current_user, owner_type, doc_external_id)
    return {"shares": await vault.get_document_shares_details(str(doc_external_id), owner_type)}


@router.delete("/share/{doc_external_id}")
async def revoke_share(doc_external_id: UUID, conversation_id: Optional[UUID] = Query(None),
                       owner_type: OwnerType = Query("patient"), current_user: User = Depends(get_current_user)):
    """Revoke one share (conversation_id given) or all shares of a document."""
    await _require_document_owner(current_user, owner_type, doc_external_id)
    await vault.revoke_share(str(doc_external_id), owner_type, str(conversation_id) if conversation_id else None)
    return {"status": "revoked"}


@router.patch("/{doc_external_id}")
async def rename_document(doc_external_id: UUID, body: DocumentRenameRequest,
                          current_user: User = Depends(get_current_user)):
    await _require_document_owner(current_user, body.owner_type, doc_external_id)
    await vault.rename_document(str(doc_external_id), body.original_name, body.owner_type)
    return {"status": "renamed"}


@router.delete("/{doc_external_id}")
async def delete_document(doc_external_id: UUID, owner_type: OwnerType = Query("patient"),
                          current_user: User = Depends(get_current_user)):
    await _require_document_owner(current_user, owner_type, doc_external_id)
    await vault.delete_document(str(doc_external_id), owner_type)
    return {"status": "deleted"}


@router.get("/download/{doc_external_id}")
async def get_download_url(doc_external_id: UUID, request: Request, current_user: User = Depends(get_current_user)):
    """Short-lived signed link for the owner or anyone the document is actively shared with."""
    doc = await vault.find_readable_document(str(doc_external_id), current_user.id)
    if doc is None:
        raise _NOT_FOUND
    signature, expires = sign_key(doc["blob_name"], DOWNLOAD_LINK_TTL_SECONDS)
    url = (f"{request.url_for('get_document_content')}?key={quote(doc['blob_name'], safe='')}"
           f"&expires={expires}&signature={signature}")
    return {"download_url": url, "expires_in_seconds": DOWNLOAD_LINK_TTL_SECONDS}


@router.get("/content", name="get_document_content")
async def get_document_content(key: str, expires: int, signature: str):
    """Serve a vault document for a valid signed link (see /download/{id})."""
    if not key.startswith("vault/") or not verify_signed_key(key, signature, expires):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Link expired or invalid")
    data = await get_storage().get(key)
    if data is None:
        raise _NOT_FOUND
    return Response(content=data, media_type=guess_content_type(key),
                    headers={"Content-Disposition": "inline", "Cache-Control": "private, max-age=300",
                             "X-Content-Type-Options": "nosniff"})
