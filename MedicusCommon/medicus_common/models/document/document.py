from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Literal


# --- Base Models ---

class DocumentBase(BaseModel):
    original_name: str = Field(..., example="lab_results_jan.pdf")
    mime_type: str = Field(..., example="application/pdf")


# --- Upload Flow Models ---

class UploadInitRequest(DocumentBase):
    """Payload sent by FE to start an upload."""
    pass


class UploadInitResponse(BaseModel):
    """Response from BE with the 'permission slip' for Azure."""
    doc_external_id: UUID
    upload_url: str  # The Azure SAS URL
    blob_path: str


class UploadFinalizeRequest(BaseModel):
    """Payload sent by FE after Azure upload is successful."""
    doc_external_id: UUID
    size_bytes: int
    owner_type: Literal["patient", "doctor"]


# --- Sharing Models ---

class DocumentShareRequest(BaseModel):
    """Payload to link a doc to a conversation."""
    doc_external_id: UUID
    conversation_id: UUID


# --- Vault View Models (match materialized views) ---

class VaultDocument(DocumentBase):
    """Document as returned from docs.*_vault_view.

    Maps to:
      external_id, original_name, mime_type, size_bytes, created_at,
      shared_with, active_shares
    """
    external_id: UUID
    size_bytes: int
    created_at: datetime
    active_shares: int = 0
    shared_with: List[str] = []

    class Config:
        from_attributes = True


class InboxDocument(DocumentBase):
    """Document as returned from docs.*_inbox_view.

    Maps to:
      external_id, original_name, mime_type, shared_at, conversation_id,
      from_doctor (patient_inbox_view) / from_patient (doctor_inbox_view)
    """
    external_id: UUID
    shared_at: datetime
    shared_by_name: str  # from_doctor or from_patient aliased in query
    conversation_id: Optional[UUID] = None

    class Config:
        from_attributes = True


# --- Rename / Delete Request Models ---

class DocumentRenameRequest(BaseModel):
    """Payload to rename a document."""
    original_name: str
    owner_type: Literal["patient", "doctor"]
