from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


# Basic metadata and media classes used by Document
class Metadata(BaseModel):
    doctor_id: Optional[int] = None
    country_id: Optional[int] = None
    specialty_id: Optional[int] = None
    created_at: Optional[datetime] = None


class Source(BaseModel):
    path: Optional[str] = None
    ext: Optional[str] = None


class Media(BaseModel):
    path: Optional[str] = None
    ext: Optional[str] = None
    alt_text: Optional[str] = None


class MediaMetadata(BaseModel):
    relevance: Optional[bool] = None
    title: Optional[str] = None
    description_summary: Optional[str] = None


class MediaType(Enum):
    TEXT = "text"
    IMAGE = "image"
    TABLE = "table"
    AUDIO = "audio"
    VIDEO = "video"


class Document(BaseModel):
    document_id: str
    document_type: MediaType
    text: Optional[str] = None
    metadata: Metadata = Field(default_factory=Metadata)
    media: Optional[Media] = None
    media_metadata: Optional[MediaMetadata] = None
    source: Optional[Source] = None
