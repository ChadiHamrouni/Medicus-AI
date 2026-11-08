"""MediKnowledge API: a doctor manages the material their assistant answers patients from.

    POST   /knowledge/documents        upload a PDF/TXT/MD file, or send `text` (+ `title`)
    GET    /knowledge/documents        list the doctor's documents
    DELETE /knowledge/documents/{id}   remove a document and its index
"""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from medicus_common.core.database import db_manager
from medicus_common.models.user.user_core import User, UserRole

from src.api.auth_dependencies import get_current_user
from src.tools.mediknowledge.ingest import (
    MAX_FILE_BYTES,
    add_document,
    delete_document,
    extract_text,
    list_documents,
)

router = APIRouter(prefix="/knowledge", tags=["mediknowledge"])
MAX_TEXT_CHARS = 200_000


async def current_doctor_id(user: User = Depends(get_current_user)) -> int:
    if user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors can manage knowledge documents")
    doctor_id = await db_manager.fetchval("SELECT id FROM public.doctors WHERE user_id = $1", user.id)
    if not doctor_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return doctor_id


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    doctor_id: int = Depends(current_doctor_id),
):
    if file is None and not (text and text.strip()):
        raise HTTPException(status_code=400, detail="Send a file or some text")
    try:
        if file is not None:
            data = await file.read(MAX_FILE_BYTES + 1)
            body = extract_text(data, file.filename or "")
            name, mime = file.filename, file.content_type
        else:
            if len(text) > MAX_TEXT_CHARS:
                raise ValueError(f"Text too long (max {MAX_TEXT_CHARS} characters)")
            body, name, mime = text, None, "text/plain"
        doc_title = (title or "").strip() or (name.rsplit(".", 1)[0] if name else "Note")
        return await add_document(doctor_id, doc_title, body, source_name=name, mime_type=mime)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/documents")
async def get_documents(doctor_id: int = Depends(current_doctor_id)):
    return {"documents": await list_documents(doctor_id)}


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document(document_id: int, doctor_id: int = Depends(current_doctor_id)):
    if not await delete_document(doctor_id, document_id):
        raise HTTPException(status_code=404, detail="Document not found")
