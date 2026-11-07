"""
Doctor document models for MedicusSearch RAG system.
Handles practice documents, case studies, and educational materials.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, field_validator, ConfigDict


class DoctorDocumentCategory(Enum):
    """Categories for doctor documents in MedicusSearch"""
    PRACTICE_DOCS = "practice-docs"
    BEFORE_AFTER_PHOTOS = "before-after-photos" 
    CASE_STUDIES = "case-studies"


class DoctorCredentialCategory(Enum):
    """Categories for doctor credential documents"""
    MEDICAL_LICENSE = "medical_license"
    DEA_REGISTRATION = "dea_registration"
    BOARD_CERTIFICATION = "board_certification"
    MALPRACTICE_INSURANCE = "malpractice_insurance"
    GOVERNMENT_ID = "government_id"
    PROOF_OF_ADDRESS = "proof_of_address"
    CV_RESUME = "cv_resume"
    MEDICAL_DIPLOMA = "medical_diploma"
    RESIDENCY_CERTIFICATE = "residency_certificate"
    CME_CERTIFICATE = "cme_certificate"
    HOSPITAL_PRIVILEGES = "hospital_privileges"
    PROFESSIONAL_HEADSHOT = "professional_headshot"


class MedicalSpecialty(Enum):
    """Medical specialties for document categorization"""
    GENERAL_PRACTICE = "general_practice"
    DERMATOLOGY = "dermatology"
    CARDIOLOGY = "cardiology"
    NEUROLOGY = "neurology"
    ORTHOPEDICS = "orthopedics"
    PEDIATRICS = "pediatrics"
    PSYCHIATRY = "psychiatry"
    RADIOLOGY = "radiology"
    SURGERY = "surgery"
    INTERNAL_MEDICINE = "internal_medicine"
    EMERGENCY_MEDICINE = "emergency_medicine"
    ANESTHESIOLOGY = "anesthesiology"
    PATHOLOGY = "pathology"
    ONCOLOGY = "oncology"
    GYNECOLOGY = "gynecology"
    OPHTHALMOLOGY = "ophthalmology"
    ENT = "ent"
    UROLOGY = "urology"
    GASTROENTEROLOGY = "gastroenterology"
    ENDOCRINOLOGY = "endocrinology"


class DocumentVisibility(Enum):
    """Document visibility levels"""
    PRIVATE = "private"          # Only the doctor can see
    SHAREABLE = "shareable"      # Can be shared in search results
    PUBLIC = "public"            # Available to all platform users


class DocumentStatus(Enum):
    """Document processing status"""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"
    ARCHIVED = "archived"


# Request Models

class DoctorDocumentUploadRequest(BaseModel):
    """Request model for doctor document upload"""
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    category: DoctorDocumentCategory = Field(..., description="Document category")
    title: Optional[str] = Field(None, max_length=500, description="Document title")
    description: Optional[str] = Field(None, max_length=2000, description="Document description")
    specialty: Optional[MedicalSpecialty] = Field(None, description="Medical specialty")
    tags: List[str] = Field(default_factory=list, description="Searchable tags")
    visibility: DocumentVisibility = Field(default=DocumentVisibility.PRIVATE, description="Visibility level")
    content_type: Optional[str] = Field(None, description="MIME content type")
    
    @field_validator('tags')
    def validate_tags(cls, v):
        """Validate tags list"""
        if len(v) > 20:
            raise ValueError("Maximum 20 tags allowed")
        for tag in v:
            if len(tag) > 50:
                raise ValueError("Tag length cannot exceed 50 characters")
        return [tag.strip().lower() for tag in v if tag.strip()]
    
    @field_validator('filename')
    def validate_filename(cls, v):
        """Validate filename"""
        if not v or not v.strip():
            raise ValueError("Filename cannot be empty")
        
        # Check for dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        if any(char in v for char in dangerous_chars):
            raise ValueError("Filename contains invalid characters")
        
        return v.strip()


class BulkDocumentUploadRequest(BaseModel):
    """Request model for bulk document upload"""
    documents: List[DoctorDocumentUploadRequest] = Field(..., min_items=1, max_items=50)
    default_category: Optional[DoctorDocumentCategory] = None
    default_specialty: Optional[MedicalSpecialty] = None
    default_visibility: DocumentVisibility = Field(default=DocumentVisibility.PRIVATE)


# Response Models

class DoctorDocumentMetadata(BaseModel):
    """Document metadata for responses"""
    document_id: str = Field(..., description="Unique document identifier")
    doctor_id: int = Field(..., description="Owner doctor ID")
    filename: str = Field(..., description="Original filename")
    title: Optional[str] = None
    description: Optional[str] = None
    category: DoctorDocumentCategory
    specialty: Optional[str] = None  # Specialty name as string
    tags: List[str] = Field(default_factory=list)
    visibility: DocumentVisibility
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    status: DocumentStatus
    blob_url: Optional[str] = None
    download_url: Optional[str] = None  # Signed URL
    indexed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(json_encoders={
            datetime: lambda v: v.isoformat()
        })


class DoctorDocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    document_id: str
    filename: str
    category: DoctorDocumentCategory
    upload_status: str = "success"
    blob_url: Optional[str] = None
    message: str = "Document uploaded successfully"
    requires_processing: bool = True  # Whether it needs to be indexed
    
    model_config = ConfigDict(use_enum_values=True)


class BulkDocumentUploadResponse(BaseModel):
    """Response model for bulk document upload"""
    total_uploaded: int
    successful_uploads: List[DoctorDocumentUploadResponse]
    failed_uploads: List[Dict[str, str]]  # filename -> error message
    processing_queue_position: Optional[int] = None


class DocumentListResponse(BaseModel):
    """Response model for document listing"""
    documents: List[DoctorDocumentMetadata]
    total_count: int
    page: int = 1
    page_size: int = 20
    has_next: bool = False
    filters_applied: Dict[str, Any] = Field(default_factory=dict)


class DocumentSearchResponse(BaseModel):
    """Response model for document search"""
    documents: List[DoctorDocumentMetadata]
    total_count: int
    search_query: str
    took_ms: Optional[int] = None  # Search execution time
    suggested_tags: List[str] = Field(default_factory=list)


class DocumentStatsResponse(BaseModel):
    """Response model for document statistics"""
    total_documents: int
    documents_by_category: Dict[str, int]
    documents_by_specialty: Dict[str, int]
    documents_by_status: Dict[str, int]
    total_file_size_mb: float
    indexed_documents: int
    pending_indexing: int


# Filter Models

class DocumentFilter(BaseModel):
    """Filter model for document queries"""
    category: Optional[DoctorDocumentCategory] = None
    specialty: Optional[MedicalSpecialty] = None
    visibility: Optional[DocumentVisibility] = None
    status: Optional[DocumentStatus] = None
    tags: List[str] = Field(default_factory=list)
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    search_query: Optional[str] = Field(None, max_length=500)


# Database Models (for internal use)

class DoctorDocumentDB(BaseModel):
    """Database model for doctor documents"""
    document_id: str
    doctor_id: int
    filename: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: str  # Store as string in DB
    specialty_id: Optional[int] = None  # Store as integer ID referencing specialties table
    tags: List[str] = Field(default_factory=list)
    visibility: str  # Store as string in DB
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    status: str  # Store as string in DB
    blob_url: Optional[str] = None
    blob_path: Optional[str] = None
    elasticsearch_id: Optional[str] = None  # For tracking in search index
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Additional metadata
    indexed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    
    def to_response_model(self, download_url: Optional[str] = None, specialty_name: Optional[str] = None) -> DoctorDocumentMetadata:
        """Convert to response model"""
        return DoctorDocumentMetadata(
            document_id=self.document_id,
            doctor_id=self.doctor_id,
            filename=self.filename,
            title=self.title,
            description=self.description,
            category=DoctorDocumentCategory(self.category),
            specialty=specialty_name,  # Pass the specialty name from join
            tags=self.tags,
            visibility=DocumentVisibility(self.visibility),
            content_type=self.content_type,
            file_size=self.file_size,
            status=DocumentStatus(self.status),
            blob_url=self.blob_url,
            download_url=download_url,
            indexed_at=self.indexed_at,
            created_at=self.created_at,
            updated_at=self.updated_at
        )


# Validation Helpers

ALLOWED_CONTENT_TYPES = {
    # Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    
    # Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    
    # Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    # Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_TOTAL_STORAGE_PER_DOCTOR = 2 * 1024 * 1024 * 1024  # 2GB


def validate_file_upload(filename: str, content_type: str, file_size: int) -> None:
    """Validate file upload parameters"""
    if not filename or not filename.strip():
        raise ValueError("Filename is required")
    
    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB")
    
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"File type '{content_type}' is not supported")
    
    # Additional filename validation
    if len(filename) > 255:
        raise ValueError("Filename too long (max 255 characters)")
    
    # Check file extension
    allowed_extensions = {
        '.pdf', '.doc', '.docx', '.txt', '.rtf',
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
        '.ppt', '.pptx', '.xls', '.xlsx'
    }
    
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_extensions:
        raise ValueError(f"File extension '{ext}' is not supported")