import * as DocumentPicker from 'expo-document-picker';
import { validateAttachment } from './AttachmentValidator';
import { Attachment } from '@/types';
import { showErrorModal } from '@/utils';

/**
 * Hook for handling file picking functionality
 * @param onFileSelect Callback function to handle selected files
 * @returns Object containing file picker functions
 */
export const useDocumentPicker = (
  onFileSelect: ((file: any) => void) | undefined
) => {
  const handleFilePicker = async () => {
    try {
      // Allow images, PDFs, and audio files
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/pdf',
          'audio/*',
        ],
        copyToCacheDirectory: true,
      });

      if (
        result.canceled === false &&
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];

        // Determine attachment type based on MIME type
        let attachmentType = 'file';
        if (file.mimeType?.startsWith('image/')) {
          attachmentType = 'image';
        } else if (file.mimeType?.startsWith('audio/')) {
          attachmentType = 'audio';
        }

        // Create attachment object
        const attachment: Attachment = {
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          type: attachmentType,
        };

        // Validate the attachment before passing it to the parent component
        if (validateAttachment(attachment) && onFileSelect) {
          onFileSelect(attachment);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      showErrorModal('Error', 'Failed to select file. Please try again.');
    }
  };

  return { handleFilePicker };
};
