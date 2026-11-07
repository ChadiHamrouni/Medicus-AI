"""Document models for the Medicus platform."""

from medicus_common.models.document.document_core import (
    Document,
    Media,
    MediaMetadata,
    MediaType,
    Metadata,
    Source,
)
from medicus_common.models.document.document_records import (
    BlobDocumentMetadata,
    ConversationAttachment,
    GNode,
    MedicusSearchDocument,
    ProfileDocument,
    RNode,
    SystemDocument,
)
from medicus_common.models.document.document_requests import (
    UploadDocumentRequest,
)
from medicus_common.models.document.document_responses import (
    DocumentDownloadResponse,
    DocumentListResponse,
    UploadDocumentResponse,
)

__all__ = [
    # document_core
    "Document",
    "Media",
    "MediaMetadata",
    "MediaType",
    "Metadata",
    "Source",
    # document_records
    "BlobDocumentMetadata",
    "ConversationAttachment",
    "GNode",
    "MedicusSearchDocument",
    "ProfileDocument",
    "RNode",
    "SystemDocument",
    # document_requests
    "UploadDocumentRequest",
    # document_responses
    "DocumentDownloadResponse",
    "DocumentListResponse",
    "UploadDocumentResponse",
]