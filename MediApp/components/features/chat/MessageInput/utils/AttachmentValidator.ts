import { Attachment } from '@/types';
import { showErrorModal } from '@/utils';

// Constants for validation
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_PDF_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
export const MAX_AUDIO_DURATION_SECONDS = 120; // 2 minutes
const ALLOWED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/m4a',
  'audio/x-m4a',
];
const ALLOWED_DOCUMENT_FORMATS = ['application/pdf', 'text/plain'];

/**
 * Validates an image attachment
 * @param attachment The attachment to validate
 * @returns True if the attachment is valid, false otherwise
 */
export const validateImageAttachment = (attachment: Attachment): boolean => {
  // Check if size is available
  if (!attachment.size) {
    showErrorModal('Error', 'Unable to determine file size');
    return false;
  }

  // Check file size
  if (attachment.size > MAX_IMAGE_SIZE_BYTES) {
    showErrorModal('File Too Large', 'File must be less than 2MB');
    return false;
  }

  // Check file format
  const mimeType = attachment.mimeType || '';
  if (!ALLOWED_IMAGE_FORMATS.includes(mimeType)) {
    showErrorModal(
      'Invalid Format',
      'Only JPEG, PNG, GIF, and WebP images are allowed'
    );
    return false;
  }

  return true;
};

/**
 * Validates an audio attachment
 * @param attachment The attachment to validate
 * @returns True if the attachment is valid, false otherwise
 */
export const validateAudioAttachment = (attachment: Attachment): boolean => {
  // Check duration
  if (attachment.duration && attachment.duration > MAX_AUDIO_DURATION_SECONDS) {
    showErrorModal(
      'Recording Too Long',
      'Audio recordings must be less than 2 minutes'
    );
    return false;
  }

  // Check file format
  const mimeType = attachment.mimeType || '';
  if (!ALLOWED_AUDIO_FORMATS.includes(mimeType)) {
    showErrorModal(
      'Invalid Format',
      'Only MP3, WAV, MP4, OGG, and WebM audio files are allowed'
    );
    return false;
  }

  return true;
};

/**
 * Validates a document attachment (PDF, text)
 * @param attachment The attachment to validate
 * @returns True if the attachment is valid, false otherwise
 */
export const validateDocumentAttachment = (attachment: Attachment): boolean => {
  // Check file format
  const mimeType = attachment.mimeType || '';
  if (!ALLOWED_DOCUMENT_FORMATS.includes(mimeType)) {
    showErrorModal('Invalid Format', 'Only PDF and text files are allowed');
    return false;
  }

  // Check PDF file size
  if (mimeType === 'application/pdf') {
    if (!attachment.size) {
      showErrorModal('Error', 'Unable to determine file size');
      return false;
    }

    if (attachment.size > MAX_PDF_SIZE_BYTES) {
      showErrorModal('File Too Large', 'PDF files must be less than 3MB');
      return false;
    }
  }

  return true;
};

/**
 * Validates any attachment based on its type
 * @param attachment The attachment to validate
 * @returns True if the attachment is valid, false otherwise
 */
export const validateAttachment = (attachment: Attachment): boolean => {
  const type = attachment.type.toLowerCase();
  const mimeType = attachment.mimeType || '';

  // Validate images
  if (
    type === 'image' ||
    type.startsWith('image/') ||
    mimeType.startsWith('image/')
  ) {
    return validateImageAttachment(attachment);
  }

  // Validate audio
  if (
    type === 'audio' ||
    type.startsWith('audio/') ||
    mimeType.startsWith('audio/')
  ) {
    return validateAudioAttachment(attachment);
  }

  // Validate documents (PDF, text)
  if (
    type === 'file' ||
    mimeType === 'application/pdf' ||
    mimeType === 'text/plain'
  ) {
    return validateDocumentAttachment(attachment);
  }

  return true;
};
