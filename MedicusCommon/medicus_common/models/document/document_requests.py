
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class UploadDocumentRequest(BaseModel):
    """Request model for document upload"""
    filename: str = Field(..., description="Original filename")
    content_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_shareable: bool = Field(default=False)


