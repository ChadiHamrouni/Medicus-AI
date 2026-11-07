from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl, ConfigDict

# Import base classes from document_core
from medicus_common.models.document.document_core import (
    Document,
    MediaType,
    Metadata,
)


class GNode(Document):
    node_id: str


class RNode(BaseModel):
    gnode_id: str
    text: str
    clean_text: Optional[str] = None
    vector: Optional[List[float]] = None
    metadata: Metadata = Field(default_factory=Metadata)    

class BlobDocumentMetadata(BaseModel):
    """Metadata for Azure Blob Storage documents"""
    blob_url: HttpUrl
    blob_path: str
    filename: str
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    upload_timestamp: Optional[datetime] = None
    last_modified: Optional[datetime] = None
    azure_metadata: Dict[str, Any] = Field(default_factory=dict)


class ConversationAttachment(BaseModel):
    """Model for conversation message attachments"""
    attachment_id: str = Field(..., description="Unique attachment identifier")
    message_id: int = Field(..., description="Parent message ID")
    conversation_id: int = Field(..., description="Parent conversation ID")
    original_filename: str = Field(..., description="Original uploaded filename")
    blob_metadata: BlobDocumentMetadata = Field(..., description="Azure blob storage metadata")
    media_type: MediaType = Field(..., description="Type of media content")
    created_at: datetime = Field(default_factory=datetime.now)
    
    model_config = ConfigDict(json_encoders={
            datetime: lambda v: v.isoformat()
        })


class ProfileDocument(BaseModel):
    """Model for user profile documents (avatars, licenses, etc.)"""
    document_id: str = Field(..., description="Unique document identifier")
    user_id: int = Field(..., description="Owner user ID")
    user_type: str = Field(..., description="patient or doctor")
    document_category: str = Field(..., description="avatar, license, insurance_card, etc.")
    blob_metadata: BlobDocumentMetadata = Field(..., description="Azure blob storage metadata")
    is_active: bool = Field(default=True, description="Whether document is current version")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(json_encoders={
            datetime: lambda v: v.isoformat()
        })


class MedicusSearchDocument(BaseModel):
    """Model for MedicusSearch RAG documents"""
    document_id: str = Field(..., description="Unique document identifier")
    document_category: str = Field(..., description="practice-docs, regulations, etc.")
    title: Optional[str] = None
    description: Optional[str] = None
    blob_metadata: BlobDocumentMetadata = Field(..., description="Azure blob storage metadata")
    owner_id: Optional[int] = None  # doctor_id for practice docs
    owner_type: Optional[str] = None  # doctor, admin, system
    country: Optional[str] = None  # for regulations
    specialty: Optional[str] = None  # medical specialty
    tags: List[str] = Field(default_factory=list)
    is_shareable: bool = Field(default=False, description="Whether document can be shared publicly")
    indexed_at: Optional[datetime] = None  # when indexed in Elasticsearch
    created_at: datetime = Field(default_factory=datetime.now)
    
    model_config = ConfigDict(json_encoders={
            datetime: lambda v: v.isoformat()
        })


class SystemDocument(BaseModel):
    """Model for system-level documents"""
    document_id: str = Field(..., description="Unique document identifier")
    category: str = Field(..., description="backups, logs, temp")
    purpose: Optional[str] = None
    blob_metadata: BlobDocumentMetadata = Field(..., description="Azure blob storage metadata")
    retention_days: Optional[int] = None  # how long to keep the document
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    model_config = ConfigDict(json_encoders={
            datetime: lambda v: v.isoformat()
        })
