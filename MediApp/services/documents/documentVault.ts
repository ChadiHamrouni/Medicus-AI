// Document Vault Service — 3-step Azure upload flow
// Handshake → Azure PUT → Finalize

import * as FileSystem from 'expo-file-system/legacy';
import { authenticatedFetch, env } from '@/utils';
import type {
  UploadInitRequest,
  UploadInitResponse,
  UploadFinalizeRequest,
  DocumentShareRequest,
  VaultResponse,
  SharedResponse,
} from '@/types/documents';

export const DOCS_BASE = `${env.medicusUserApiBaseUrl}/docs`;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

/**
 * Single-step server-side upload.
 * Returns the doc_external_id on success.
 */
export async function uploadFileToVault(
  fileUri: string,
  fileName: string,
  mimeType: string,
  ownerType: 'patient' | 'doctor',
  ownerId: number,
  onProgress?: (percent: number) => void,
): Promise<{ doc_external_id: string; original_name: string; blob_path: string; blob_url: string }> {
  // --- Validate file size ---
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) throw new Error('File not found');
  if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  onProgress?.(10);

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);
  formData.append('owner_type', ownerType);
  formData.append('owner_id', String(ownerId));

  onProgress?.(30);

  try {
    const res = await authenticatedFetch(`${DOCS_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => 'Unknown error');
      throw new Error(`Upload failed: ${res.status} - ${err}`);
    }

    onProgress?.(90);

    const data: { doc_external_id: string; original_name: string; blob_path: string; blob_url: string } = await res.json();

    onProgress?.(100);
    return data;
  } catch (error) {
    console.error("Upload error", error);
    throw error;
  }
}

/**
 * Share a document in a conversation.
 */
export async function shareDocument(
  docExternalId: string,
  conversationId: string,
  ownerType: 'patient' | 'doctor',
): Promise<void> {
  const body: DocumentShareRequest = {
    doc_external_id: docExternalId,
    conversation_id: conversationId,
    owner_type: ownerType,
  };
  const res = await authenticatedFetch(`${DOCS_BASE}/share`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Share failed: ${res.status}`);
}

/**
 * Rename a document.
 */
export async function renameDocument(
  docExternalId: string,
  newName: string,
  ownerType: 'patient' | 'doctor',
): Promise<void> {
  const res = await authenticatedFetch(`${DOCS_BASE}/${docExternalId}`, {
    method: 'PATCH',
    body: JSON.stringify({ original_name: newName, owner_type: ownerType }),
  });
  if (!res.ok) throw new Error(`Rename failed: ${res.status}`);
}

/**
 * Soft delete a document.
 */
export async function deleteDocument(
  docExternalId: string,
  ownerType: 'patient' | 'doctor',
): Promise<void> {
  const res = await authenticatedFetch(
    `${DOCS_BASE}/${docExternalId}?owner_type=${ownerType}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

/**
 * Get vault documents for an owner.
 */
export async function getVaultDocs(
  ownerType: 'patient' | 'doctor',
  ownerId: number,
): Promise<VaultResponse> {
  const url = `${DOCS_BASE}/vault/${ownerType}/${ownerId}`;
  console.log('[getVaultDocs] Fetching:', url);
  const res = await authenticatedFetch(url);
  console.log('[getVaultDocs] Status:', res.status);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.log('[getVaultDocs] Error body:', errText);
    throw new Error(`Failed to fetch vault: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  console.log('[getVaultDocs] Response:', JSON.stringify(data).substring(0, 200));
  return data;
}

/**
 * Get documents shared with an owner.
 */
export async function getSharedDocs(
  ownerType: 'patient' | 'doctor',
  ownerId: number,
): Promise<SharedResponse> {
  const res = await authenticatedFetch(`${DOCS_BASE}/shared/${ownerType}/${ownerId}`);
  if (!res.ok) throw new Error(`Failed to fetch shared docs: ${res.status}`);
  return res.json();
}

/**
 * Revoke all shares of a document.
 */
export async function revokeShare(
  docExternalId: string,
  ownerType: 'patient' | 'doctor',
  conversationId?: string,
): Promise<void> {
  let url = `${DOCS_BASE}/share/${docExternalId}?owner_type=${ownerType}`;
  if (conversationId) {
    url += `&conversation_id=${conversationId}`;
  }
  const res = await authenticatedFetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Revoke failed: ${res.status}`);
}

/**
 * Get a temporary download URL for a document.
 */
export async function getDownloadUrl(
  docExternalId: string,
  ownerType: 'patient' | 'doctor',
): Promise<string> {
  const res = await authenticatedFetch(
    `${DOCS_BASE}/download/${docExternalId}?owner_type=${ownerType}`,
  );
  if (!res.ok) throw new Error(`Download URL failed: ${res.status}`);
  const data = await res.json();
  return data.download_url;
}