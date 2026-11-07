import * as ImagePicker from 'expo-image-picker';
import { validateImageAttachment } from './AttachmentValidator';
import { Attachment } from '@/types';
import { showErrorModal } from '@/utils';

export const useCameraHandler = (
  onImageSelect: ((image: any) => void) | undefined
) => {
  const handleCameraPress = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      showErrorModal(
        'Camera Permission Required',
        'We need camera permissions to take photos. Please enable it in your device settings.'
      );
      return;
    }

    try {
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Handle the captured image
        const asset = result.assets[0];
        const imageUri = asset.uri;

        // Create attachment object
        const attachment: Attachment = {
          uri: imageUri,
          type: 'image',
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
          name: `camera_image_${new Date().getTime()}.jpg`,
        };

        // Validate the image before passing it to the parent component
        if (validateImageAttachment(attachment) && onImageSelect) {
          onImageSelect(attachment);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showErrorModal('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleGalleryPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      showErrorModal(
        'Gallery Permission Required',
        'We need gallery permissions to select photos. Please enable it in your device settings.'
      );
      return;
    }

    try {
      // Launch image library with multiple selection enabled
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Process all selected images
        const validAttachments: Attachment[] = [];

        for (const asset of result.assets) {
          const attachment: Attachment = {
            uri: asset.uri,
            type: 'image',
            mimeType: asset.mimeType || 'image/jpeg',
            size: asset.fileSize || 0,
            name: `gallery_image_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}.jpg`,
          };

          // Validate each image
          if (validateImageAttachment(attachment)) {
            validAttachments.push(attachment);
          }
        }

        // Pass all valid attachments to the parent component
        if (validAttachments.length > 0 && onImageSelect) {
          // If multiple images, pass as array; if single, pass as single object for backward compatibility
          if (validAttachments.length === 1) {
            onImageSelect(validAttachments[0]);
          } else {
            onImageSelect(validAttachments as any);
          }
        }
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      showErrorModal('Error', 'Failed to select photo. Please try again.');
    }
  };

  return { handleCameraPress, handleGalleryPress };
};
