import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { parseErrorMessage, showErrorModal } from '@/utils';
import { ALLOWED_FILE_TYPES } from '@/constants/DocumentManager';

export type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
};

export type DocumentUploadProps = {
  onUploadSuccess: (_document: Document) => void;
  className?: string;
  uploadText?: string;
  allowedTypes?: string[];
};

export function DocumentUpload({
  onUploadSuccess,
  className = 'mb-6 bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl items-center justify-center py-8 px-4 active:bg-orange-100',
  uploadText = 'Tap to upload a document',
  allowedTypes = ALLOWED_FILE_TYPES,
}: DocumentUploadProps) {
  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newDocument: Document = {
          id: Date.now().toString(),
          name: asset.name,
          type: asset.mimeType?.includes('pdf')
            ? 'pdf'
            : asset.mimeType?.includes('image')
              ? 'image'
              : 'document',
          size: asset.size || 0,
          createdAt: new Date(),
        };

        onUploadSuccess(newDocument);
        Alert.alert('Success', 'Document uploaded successfully!');
      }
    } catch (error) {
      // console.error('Error uploading document:', error);

      // Check if it's a file size error
      const errorMessage = parseErrorMessage(error);
      if (errorMessage.toLowerCase().includes('file too large')) {
        showErrorModal(
          'File Too Large',
          'The file exceeds the maximum allowed size. Please reduce the file size and try again.'
        );
      } else {
        showErrorModal(
          'Upload Failed',
          'Failed to upload document. Please try again.'
        );
      }
    }
  };

  return (
    <TouchableOpacity
      className={className}
      onPress={handleUpload}
      activeOpacity={0.85}
    >
      <Ionicons name="cloud-upload-outline" size={48} color="#F05C0C" />
      <Text className="mt-3 text-lg font-semibold text-orange-600">
        {uploadText}
      </Text>
      <Text className="text-gray-500">PDF, Images, Documents</Text>
    </TouchableOpacity>
  );
}
