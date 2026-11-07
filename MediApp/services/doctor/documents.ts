import {
  DoctorDocumentUploadRequest,
  DoctorDocumentUploadResponse,
  DocumentListResponse,
  DocumentStatsResponse,
  DocumentFilter,
  CategoryOption,
  SpecialtyOption,
  VisibilityOption,
  UploadGuidelines,
} from '@/types/DoctorDocuments';
import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_SEARCH_BASE_URL = `${env.medicusApiBaseUrl}MedicusSearch`;

/**
 * Get upload guidelines and file restrictions
 */
export const getUploadGuidelines = async (): Promise<UploadGuidelines> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/upload-guidelines`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get upload guidelines: ${response.statusText}`
      );
    }

    const guidelines: UploadGuidelines = await response.json();
    return guidelines;
  } catch (error) {
    logger.error('Failed to get upload guidelines', error as Error, {
      component: 'DoctorDocumentService',
    });
    throw error;
  }
};

/**
 * Get available categories and specialties
 */
export const getDocumentCategories = async (): Promise<{
  categories: CategoryOption[];
  specialties: SpecialtyOption[];
  visibility_levels: VisibilityOption[];
}> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/categories`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get document categories: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Failed to get document categories', error as Error, {
      component: 'DoctorDocumentService',
    });
    throw error;
  }
};

/**
 * Upload a doctor document
 */
export const uploadDoctorDocument = async (
  file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  },
  metadata: DoctorDocumentUploadRequest
): Promise<DoctorDocumentUploadResponse> => {
  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Add file
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    // Add metadata fields
    formData.append('category', metadata.category);

    if (metadata.title) {
      formData.append('title', metadata.title);
    }

    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    if (metadata.specialty) {
      formData.append('specialty', metadata.specialty);
    }

    if (metadata.tags.length > 0) {
      formData.append('tags', metadata.tags.join(','));
    }

    formData.append('visibility', metadata.visibility);

    const response = await authenticatedFetch(
      `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/documents/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(
        errorData.detail || `Upload failed: ${response.statusText}`
      );
    }

    const uploadResponse: DoctorDocumentUploadResponse = await response.json();

    logger.info('Document uploaded successfully', {
      component: 'DoctorDocumentService',
      documentId: uploadResponse.document_id,
      filename: uploadResponse.filename,
    });

    return uploadResponse;
  } catch (error) {
    logger.error('Failed to upload document', error as Error, {
      component: 'DoctorDocumentService',
      filename: file.name,
    });
    throw error;
  }
};

/**
 * Get list of doctor's documents with filtering
 */
export const getDoctorDocuments = async (
  filters: DocumentFilter = {}
): Promise<DocumentListResponse> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();

    if (filters.category) {
      params.append('category', filters.category);
    }

    if (filters.specialty) {
      params.append('specialty', filters.specialty);
    }

    if (filters.status) {
      params.append('status', filters.status);
    }

    if (filters.visibility) {
      params.append('visibility', filters.visibility);
    }

    if (filters.search_query) {
      params.append('search', filters.search_query);
    }

    params.append('page', (filters.page || 1).toString());
    params.append('page_size', (filters.page_size || 20).toString());

    const response = await authenticatedFetch(
      `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/documents?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get documents: ${response.statusText}`);
    }

    const documentsResponse: DocumentListResponse = await response.json();
    return documentsResponse;
  } catch (error) {
    logger.error('Failed to get doctor documents', error as Error, {
      component: 'DoctorDocumentService',
    });
    throw error;
  }
};

/**
 * Get document download URL
 */
export const getDocumentDownloadUrl = async (
  documentId: string,
  expiryHours: number = 24
): Promise<{
  document_id: string;
  download_url: string;
  expires_in_hours: number;
}> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/documents/${documentId}/download?expiry_hours=${expiryHours}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get download URL: ${response.statusText}`);
    }

    const downloadData = await response.json();
    return downloadData;
  } catch (error) {
    logger.error('Failed to get document download URL', error as Error, {
      component: 'DoctorDocumentService',
      documentId,
    });
    throw error;
  }
};

/**
 * Update document metadata
 */
export const updateDocumentMetadata = async (
  documentId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    visibility?: string;
  }
): Promise<{ message: string }> => {
  try {
    // Create FormData for the update
    const formData = new FormData();

    if (updates.title !== undefined) {
      formData.append('title', updates.title);
    }

    if (updates.description !== undefined) {
      formData.append('description', updates.description);
    }

    if (updates.tags !== undefined) {
      formData.append('tags', updates.tags.join(','));
    }

    if (updates.visibility !== undefined) {
      formData.append('visibility', updates.visibility);
    }

    const response = await authenticatedFetch(
      `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/documents/${documentId}/metadata`,
      {
        method: 'PUT',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update document metadata: ${response.statusText}`
      );
    }

    const result = await response.json();

    logger.info('Document metadata updated successfully', {
      component: 'DoctorDocumentService',
      documentId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to update document metadata', error as Error, {
      component: 'DoctorDocumentService',
      documentId,
    });
    throw error;
  }
};

/**
 * Delete a document
 */
export const deleteDoctorDocument = async (
  documentId: string
): Promise<{ message: string }> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/documents/${documentId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }

    const result = await response.json();

    logger.info('Document deleted successfully', {
      component: 'DoctorDocumentService',
      documentId,
    });

    return result;
  } catch (error) {
    logger.error('Failed to delete document', error as Error, {
      component: 'DoctorDocumentService',
      documentId,
    });
    throw error;
  }
};

/**
 * Get doctor's document statistics
 */
export const getDoctorDocumentStats =
  async (): Promise<DocumentStatsResponse> => {
    try {
      const response = await authenticatedFetch(
        `${MEDICUS_SEARCH_BASE_URL}/api/v1/doctors/documents/stats`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get document statistics: ${response.statusText}`
        );
      }

      const stats: DocumentStatsResponse = await response.json();
      return stats;
    } catch (error) {
      logger.error('Failed to get document statistics', error as Error, {
        component: 'DoctorDocumentService',
      });
      throw error;
    }
  };
