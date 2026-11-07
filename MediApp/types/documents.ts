// Document vault types — matches MedicusUser /docs/* API contracts

export interface UploadInitRequest {
  original_name: string;
  mime_type: string;
  owner_type: 'patient' | 'doctor';
  owner_id: number;
}

export interface UploadInitResponse {
  doc_external_id: string;
  upload_url: string;
  blob_path: string;
}

export interface UploadFinalizeRequest {
  doc_external_id: string;
  size_bytes: number;
  owner_type: 'patient' | 'doctor';
}

export interface DocumentShareRequest {
  doc_external_id: string;
  conversation_id: string;
  owner_type: 'patient' | 'doctor';
}

export interface DocumentRecord {
  external_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  active_shares: number;
  shared_with: string[];
}

export interface SharedDocumentRecord {
  external_id: string;
  original_name: string;
  mime_type: string;
  shared_at: string;
  shared_by_name: string;
  conversation_id: string | null;
}

export interface VaultResponse {
  documents: DocumentRecord[];
}

export interface SharedResponse {
  documents: SharedDocumentRecord[];
}