from datetime import datetime
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, ConfigDict


class UploadDocumentResponse(BaseModel):
    """Response model for document upload"""
    document_id: str
    blob_url: str
    upload_url: Optional[str] = None  # signed URL for direct upload
    success: bool = True
    message: str = "Document uploaded successfully"


class DocumentListResponse(BaseModel):
    """Response model for document listing"""
    documents: List[Dict[str, Any]]
    total_count: int
    page: int = 1
    page_size: int = 20
    has_next: bool = False


class DocumentDownloadResponse(BaseModel):
    """Response model for document download"""
    document_id: str
    filename: str
    download_url: str  # signed URL for secure download
    expires_at: datetime
    content_type: Optional[str] = None
    file_size: Optional[int] = None

