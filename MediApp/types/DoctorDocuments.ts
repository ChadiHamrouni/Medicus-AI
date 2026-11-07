// Doctor Document Management Types for MedicusSearch Integration

export enum DoctorDocumentCategory {
  // Credentials & Licensing
  MEDICAL_LICENSE = 'medical-license',
  BOARD_CERTIFICATIONS = 'board-certifications',
  FELLOWSHIP_CERTIFICATES = 'fellowship-certificates',
  DEA_LICENSE = 'dea-license',
  STATE_PERMITS = 'state-permits',
  MALPRACTICE_INSURANCE = 'malpractice-insurance',

  // Education & Training
  MEDICAL_DEGREE = 'medical-degree',
  RESIDENCY_CERTIFICATES = 'residency-certificates',
  CONTINUING_EDUCATION = 'continuing-education',
  CONFERENCE_CERTIFICATES = 'conference-certificates',

  // Practice Documentation
  PRACTICE_DOCS = 'practice-docs',
  PROTOCOLS_PROCEDURES = 'protocols-procedures',
  QUALITY_MEASURES = 'quality-measures',
  PATIENT_TESTIMONIALS = 'patient-testimonials',

  // Clinical Work
  BEFORE_AFTER_PHOTOS = 'before-after-photos',
  CASE_STUDIES = 'case-studies',
  RESEARCH_PUBLICATIONS = 'research-publications',
  TREATMENT_OUTCOMES = 'treatment-outcomes',

  // Professional Development
  AWARDS_RECOGNITION = 'awards-recognition',
  SPEAKING_ENGAGEMENTS = 'speaking-engagements',
  MEDIA_COVERAGE = 'media-coverage',
  PROFESSIONAL_MEMBERSHIPS = 'professional-memberships',
}

export enum DocumentVisibility {
  PRIVATE = 'private', // Only the doctor can see
  SHAREABLE = 'shareable', // Can be shared in search results
  PUBLIC = 'public', // Available to all platform users
}

export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  INDEXED = 'indexed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export interface DoctorDocument {
  document_id: string;
  doctor_id: number;
  filename: string;
  title?: string;
  description?: string;
  category: DoctorDocumentCategory;
  specialty?: string;
  tags: string[];
  visibility: DocumentVisibility;
  content_type?: string;
  file_size?: number;
  status: DocumentStatus;
  blob_url?: string;
  download_url?: string;
  indexed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface DoctorDocumentUploadRequest {
  filename: string;
  category: DoctorDocumentCategory;
  title?: string;
  description?: string;
  specialty?: string;
  tags: string[];
  visibility: DocumentVisibility;
  content_type?: string;
}

export interface DoctorDocumentUploadResponse {
  document_id: string;
  filename: string;
  category: DoctorDocumentCategory;
  upload_status: string;
  blob_url?: string;
  message: string;
  requires_processing: boolean;
}

export interface DocumentListResponse {
  documents: DoctorDocument[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  filters_applied: Record<string, any>;
}

export interface DocumentStatsResponse {
  total_documents: number;
  documents_by_category: Record<string, number>;
  documents_by_specialty: Record<string, number>;
  documents_by_status: Record<string, number>;
  total_file_size_mb: number;
  indexed_documents: number;
  pending_indexing: number;
}

export interface DocumentFilter {
  category?: DoctorDocumentCategory;
  specialty?: string;
  visibility?: DocumentVisibility;
  status?: DocumentStatus;
  search_query?: string;
  page?: number;
  page_size?: number;
}

export interface CategoryOption {
  value: string;
  label: string;
  description: string;
}

export interface SpecialtyOption {
  id: number;
  value: string;
  label: string;
  short_name: string;
}

export interface VisibilityOption {
  value: string;
  label: string;
  description: string;
}

export interface UploadGuidelines {
  max_file_size_mb: number;
  allowed_file_types: string[];
  allowed_extensions: string[];
  recommendations: Record<string, string[]>;
  best_practices: string[];
}

// File upload constraints
export const DOCTOR_DOCUMENT_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_DOCTOR_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_TAGS_PER_DOCUMENT = 20;
export const MAX_TAG_LENGTH = 50;

// Smart Document Templates
export interface DocumentTemplate {
  id: string;
  name: string;
  category: DoctorDocumentCategory;
  description: string;
  required_fields: string[];
  optional_fields: string[];
  template_content: string;
  preview_url?: string;
}

// Before/After Photo Management
export interface BeforeAfterPhotoSet {
  id: string;
  doctor_id: number;
  patient_consent_id?: string;
  procedure_name: string;
  procedure_date: string;
  specialty: string;
  body_area: string;
  before_photos: PhotoReference[];
  after_photos: PhotoReference[];
  follow_up_photos?: PhotoReference[];
  description?: string;
  tags: string[];
  visibility: DocumentVisibility;
  created_at: string;
  updated_at?: string;
}

export interface PhotoReference {
  id: string;
  photo_url: string;
  thumbnail_url?: string;
  angle: PhotoAngle;
  lighting_conditions?: string;
  camera_settings?: string;
  upload_date: string;
  file_size: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export enum PhotoAngle {
  FRONT = 'front',
  SIDE_LEFT = 'side-left',
  SIDE_RIGHT = 'side-right',
  BACK = 'back',
  CLOSE_UP = 'close-up',
  WIDE_ANGLE = 'wide-angle',
  CUSTOM = 'custom',
}

// Smart Document Generation
export interface DocumentGenerationRequest {
  template_id: string;
  doctor_id: number;
  field_data: Record<string, any>;
  output_format: 'pdf' | 'docx' | 'html';
  watermark?: boolean;
  auto_save?: boolean;
}

export interface DocumentGenerationResponse {
  document_id: string;
  generated_url: string;
  status: 'generating' | 'completed' | 'failed';
  file_size?: number;
  preview_url?: string;
  message?: string;
}

// License and Certification Management
export interface MedicalLicense {
  id: string;
  license_type: 'medical' | 'dea' | 'state-permit' | 'specialty-board';
  medical_licence: string;
  issuing_state: string;
  issuing_organization: string;
  issue_date: string;
  expiration_date: string;
  status: 'active' | 'expired' | 'suspended' | 'pending-renewal';
  specialty?: string;
  verification_url?: string;
  document_id?: string; // Link to uploaded document
}

export interface BoardCertification {
  id: string;
  board_name: string;
  specialty: string;
  sub_specialty?: string;
  certification_date: string;
  expiration_date?: string;
  status:
    | 'certified'
    | 'expired'
    | 'in-process'
    | 'maintenance-of-certification';
  certificate_number?: string;
  verification_url?: string;
  document_id?: string; // Link to uploaded certificate
}

// Document Category Metadata
export interface DocumentCategoryMeta {
  category: DoctorDocumentCategory;
  display_name: string;
  description: string;
  icon: string;
  required_for_verification?: boolean;
  expiration_tracking?: boolean;
  auto_reminder_days?: number;
  upload_guidelines: string[];
  common_file_types: string[];
}

// Smart Upload Suggestions
export interface UploadSuggestion {
  category: DoctorDocumentCategory;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimated_time_minutes: number;
  template_available: boolean;
}
