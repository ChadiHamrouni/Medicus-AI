"""Data model of the MediKnowledge ingestion pipeline.

Document  -> what an extractor produces from a file (text, an image, a table...)
GNode     -> "generative" chunk: the passage given to the LLM as context
RNode     -> "retriever" chunk: a smaller passage (or a summary) with its embedding,
             pointing back to its GNode through gnode_id
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class MediaType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    TABLE = "table"
    AUDIO = "audio"
    VIDEO = "video"


class Metadata(BaseModel):
    """Who the knowledge belongs to."""
    doctor_id: Optional[str] = None
    country_id: Optional[str] = None
    specialty_id: Optional[str] = None
    created_at: Optional[datetime] = None


class Source(BaseModel):
    """The file a document was extracted from."""
    path: Optional[str] = None
    ext: Optional[str] = None


class Media(BaseModel):
    """A media file (image, table as CSV, audio...) attached to a document."""
    path: Optional[str] = None
    ext: Optional[str] = None
    alt_text: Optional[str] = None


class MediaMetadata(BaseModel):
    """LLM insights about a passage, image or table (structured output)."""
    title: str = ""
    description_summary: str = ""
    relevance: bool = False


class Document(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_type: MediaType = MediaType.TEXT
    text: Union[str, List[Any], None] = ""
    metadata: Metadata = Field(default_factory=Metadata)
    media: Optional[Media] = None
    media_metadata: Optional[MediaMetadata] = None
    source: Optional[Source] = None


class GNode(BaseModel):
    node_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: Optional[str] = None
    document_type: MediaType = MediaType.TEXT
    text: Union[str, List[Any], None] = ""
    metadata: Metadata = Field(default_factory=Metadata)
    media: Optional[Media] = None
    media_metadata: Optional[MediaMetadata] = None
    source: Optional[Source] = None


class RNode(BaseModel):
    gnode_id: str
    text: str = ""
    clean_text: str = ""
    vector: List[float] = Field(default_factory=list)
    metadata: Metadata = Field(default_factory=Metadata)
