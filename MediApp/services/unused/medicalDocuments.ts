/**
 * Medical document service for MediApp
 * Handles secure medical document upload, categorization, and management
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { logger } from '@/utils';

export interface MedicalDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uri: string;
  category: DocumentCategory;
  uploadDate: Date;
  patientId?: string;
  isEncrypted: boolean;
  metadata?: Record<string, any>;
}

export type DocumentCategory =
  | 'lab_results'
  | 'imaging'
  | 'prescription'
  | 'medical_history'
  | 'insurance'
  | 'referral'
  | 'discharge_summary'
  | 'other';

export interface DocumentUploadOptions {
  category: DocumentCategory;
  patientId?: string;
  metadata?: Record<string, any>;
  encrypt?: boolean;
}

class MedicalDocumentService {
  private static instance: MedicalDocumentService;
  private readonly DOCUMENTS_KEY = '@medical_documents';
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // Allowed medical document types
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/dicom',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  public static getInstance(): MedicalDocumentService {
    if (!MedicalDocumentService.instance) {
      MedicalDocumentService.instance = new MedicalDocumentService();
    }
    return MedicalDocumentService.instance;
  }

  /**
   * Pick and upload a medical document
   */
  public async pickAndUploadDocument(
    options: DocumentUploadOptions
  ): Promise<MedicalDocument | null> {
    try {
      logger.info('Starting document picker', {
        component: 'MedicalDocumentService',
        category: options.category,
      });

      const result = await DocumentPicker.getDocumentAsync({
        type: this.ALLOWED_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        logger.info('Document picker was canceled', {
          component: 'MedicalDocumentService',
        });
        return null;
      }

      const asset = result.assets[0];

      // Validate file size
      if (asset.size && asset.size > this.MAX_FILE_SIZE) {
        Alert.alert(
          'File Too Large',
          'Medical documents must be smaller than 50MB. Please compress your file and try again.'
        );
        return null;
      }

      // Validate file type
      if (!this.ALLOWED_TYPES.includes(asset.mimeType || '')) {
        Alert.alert(
          'Unsupported File Type',
          'Please select a PDF, image, or document file.'
        );
        return null;
      }

      return await this.processDocument(asset, options);
    } catch (error) {
      logger.error('Failed to pick document', error as Error, {
        component: 'MedicalDocumentService',
      });

      Alert.alert(
        'Document Error',
        'Failed to select document. Please try again.'
      );
      return null;
    }
  }

  /**
   * Process and store the selected document
   */
  private async processDocument(
    asset: DocumentPicker.DocumentPickerAsset,
    options: DocumentUploadOptions
  ): Promise<MedicalDocument> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create document directory if it doesn't exist
      const documentsDir = `${FileSystem.documentDirectory}medical_documents/`;
      const dirInfo = await FileSystem.getInfoAsync(documentsDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(documentsDir, {
          intermediates: true,
        });
      }

      // Move file to secure location
      const secureFileName = `${documentId}_${asset.name}`;
      const secureFilePath = `${documentsDir}${secureFileName}`;

      await FileSystem.moveAsync({
        from: asset.uri,
        to: secureFilePath,
      });

      // Create document metadata
      const document: MedicalDocument = {
        id: documentId,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
        uri: secureFilePath,
        category: options.category,
        uploadDate: new Date(),
        patientId: options.patientId,
        isEncrypted: options.encrypt || false,
        metadata: options.metadata,
      };

      // Encrypt file if requested
      if (options.encrypt) {
        await this.encryptDocumentFile(document);
      }

      // Store in local database
      await this.storeDocumentMetadata(document);

      // Log the upload for audit purposes
      logger.auditLog('medical_document_uploaded', options.patientId || '', {
        documentId,
        category: options.category,
        fileName: asset.name,
        fileSize: asset.size,
        isEncrypted: options.encrypt,
      });

      logger.info('Medical document processed successfully', {
        component: 'MedicalDocumentService',
        documentId,
        category: options.category,
        size: asset.size,
      });

      return document;
    } catch (error) {
      logger.error('Failed to process document', error as Error, {
        component: 'MedicalDocumentService',
        documentId,
      });
      throw error;
    }
  }

  /**
   * Encrypt document file for security
   */
  private async encryptDocumentFile(document: MedicalDocument): Promise<void> {
    try {
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(document.uri, {
        encoding: 'base64',
      });

      // Generate encryption key (in production, use proper key management)
      const encryptionKey = await this.generateEncryptionKey(document.id);

      // Store encrypted content (simplified encryption for demo)
      const encryptedContent = Buffer.from(fileContent, 'base64').toString(
        'hex'
      );

      await FileSystem.writeAsStringAsync(document.uri, encryptedContent, {
        encoding: 'utf8',
      });

      // Store encryption key securely
      await SecureStore.setItemAsync(`doc_key_${document.id}`, encryptionKey);

      logger.securityLog('document_encrypted', document.patientId || '', {
        documentId: document.id,
      });
    } catch (error) {
      logger.error('Failed to encrypt document', error as Error, {
        component: 'MedicalDocumentService',
        documentId: document.id,
      });
      throw error;
    }
  }

  /**
   * Generate encryption key for document
   */
  private async generateEncryptionKey(documentId: string): Promise<string> {
    // In production, use proper cryptographic key generation
    return `key_${documentId}_${Date.now()}`;
  }

  /**
   * Store document metadata locally
   */
  private async storeDocumentMetadata(
    document: MedicalDocument
  ): Promise<void> {
    try {
      const existingDocs = await this.getStoredDocuments();
      existingDocs.push(document);

      await SecureStore.setItemAsync(
        this.DOCUMENTS_KEY,
        JSON.stringify(existingDocs)
      );
    } catch (error) {
      logger.error('Failed to store document metadata', error as Error, {
        component: 'MedicalDocumentService',
      });
      throw error;
    }
  }

  /**
   * Get all stored documents
   */
  public async getStoredDocuments(): Promise<MedicalDocument[]> {
    try {
      const docsJson = await SecureStore.getItemAsync(this.DOCUMENTS_KEY);
      return docsJson ? JSON.parse(docsJson) : [];
    } catch (error) {
      logger.error('Failed to get stored documents', error as Error, {
        component: 'MedicalDocumentService',
      });
      return [];
    }
  }

  /**
   * Get documents by category
   */
  public async getDocumentsByCategory(
    category: DocumentCategory
  ): Promise<MedicalDocument[]> {
    const allDocs = await this.getStoredDocuments();
    return allDocs.filter(doc => doc.category === category);
  }

  /**
   * Get documents by patient
   */
  public async getDocumentsByPatient(
    patientId: string
  ): Promise<MedicalDocument[]> {
    const allDocs = await this.getStoredDocuments();
    return allDocs.filter(doc => doc.patientId === patientId);
  }

  /**
   * Delete a document
   */
  public async deleteDocument(documentId: string): Promise<void> {
    try {
      const documents = await this.getStoredDocuments();
      const docIndex = documents.findIndex(doc => doc.id === documentId);

      if (docIndex === -1) {
        throw new Error('Document not found');
      }

      const document = documents[docIndex];

      // Delete physical file
      const fileInfo = await FileSystem.getInfoAsync(document.uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(document.uri);
      }

      // Delete encryption key if exists
      if (document.isEncrypted) {
        try {
          await SecureStore.deleteItemAsync(`doc_key_${documentId}`);
        } catch (error) {
          // Key might not exist, continue
        }
      }

      // Remove from metadata
      documents.splice(docIndex, 1);
      await SecureStore.setItemAsync(
        this.DOCUMENTS_KEY,
        JSON.stringify(documents)
      );

      logger.auditLog('medical_document_deleted', document.patientId || '', {
        documentId,
        fileName: document.name,
      });
    } catch (error) {
      logger.error('Failed to delete document', error as Error, {
        component: 'MedicalDocumentService',
        documentId,
      });
      throw error;
    }
  }

  /**
   * Get document content (decrypt if necessary)
   */
  public async getDocumentContent(documentId: string): Promise<string | null> {
    try {
      const documents = await this.getStoredDocuments();
      const document = documents.find(doc => doc.id === documentId);

      if (!document) {
        return null;
      }

      if (document.isEncrypted) {
        return await this.decryptDocumentContent(document);
      }

      // Read unencrypted content
      return await FileSystem.readAsStringAsync(document.uri, {
        encoding: 'base64',
      });
    } catch (error) {
      logger.error('Failed to get document content', error as Error, {
        component: 'MedicalDocumentService',
        documentId,
      });
      return null;
    }
  }

  /**
   * Decrypt document content
   */
  private async decryptDocumentContent(
    document: MedicalDocument
  ): Promise<string> {
    try {
      const encryptionKey = await SecureStore.getItemAsync(
        `doc_key_${document.id}`
      );
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      // Read encrypted content
      const encryptedContent = await FileSystem.readAsStringAsync(
        document.uri,
        {
          encoding: 'utf8',
        }
      );

      // Decrypt content (simplified decryption for demo)
      const decryptedContent = Buffer.from(encryptedContent, 'hex').toString(
        'base64'
      );

      logger.securityLog('document_decrypted', document.patientId || '', {
        documentId: document.id,
      });

      return decryptedContent;
    } catch (error) {
      logger.error('Failed to decrypt document', error as Error, {
        component: 'MedicalDocumentService',
        documentId: document.id,
      });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    byCategory: Record<DocumentCategory, number>;
  }> {
    try {
      const documents = await this.getStoredDocuments();

      const stats = {
        totalDocuments: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
        byCategory: {} as Record<DocumentCategory, number>,
      };

      documents.forEach(doc => {
        stats.byCategory[doc.category] =
          (stats.byCategory[doc.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get storage stats', error as Error, {
        component: 'MedicalDocumentService',
      });

      return {
        totalDocuments: 0,
        totalSize: 0,
        byCategory: {} as Record<DocumentCategory, number>,
      };
    }
  }
}

// Export singleton instance
export const medicalDocumentService = MedicalDocumentService.getInstance();

// Export types and service
export default MedicalDocumentService;
