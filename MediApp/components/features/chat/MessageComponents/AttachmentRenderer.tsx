import { Attachment } from '@/types';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import AudioAttachment from '../AudioAttachment';
import FileAttachment from '../FileAttachment';
import { MAX_ATTACHMENT_WIDTH } from './constants';
import ImageGrid from './ImageGrid';
import { LazyImage } from '@/components/common/LazyImage';
import { authenticatedFetch } from '@/utils';

interface AttachmentRendererProps {
  attachments: Attachment[];
  uploadStatus?: 'sending' | 'failed';
  messageId?: string;
  conversationId?: string;
}

const ImageAttachment = React.memo(
  ({
    imageUri,
    maxWidth,
    isSending,
  }: {
    imageUri: string;
    maxWidth: number;
    isSending: boolean;
  }) => {
    const [hasError, setHasError] = useState(false);
    const [imageSource, setImageSource] = useState<{ uri: string } | null>(
      null
    );
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const loadImageWithAuth = async () => {
        setIsLoading(true);
        try {
          // Check if this is a MedicusConvo stream URL that needs auth
          if (imageUri.includes('/media/') && imageUri.includes('/stream')) {
            const response = await authenticatedFetch(imageUri);

            if (response.ok) {
              const blob = await response.blob();
              const base64 = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              setImageSource({ uri: base64 });
              setIsLoading(false);
              return;
            }
          }

          // For regular URIs or if auth fails, use the URI directly
          setImageSource({ uri: imageUri });
          setIsLoading(false);
        } catch {
          setHasError(true);
          setIsLoading(false);
        }
      };

      loadImageWithAuth();
    }, [imageUri]);

    return (
      <View
        style={{
          width: maxWidth,
          height: maxWidth * 0.75,
          borderRadius: 8,
          backgroundColor: isSending ? '#E5E7EB' : '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {!hasError && imageSource && (
          <LazyImage
            source={imageSource}
            style={{
              width: maxWidth,
              height: maxWidth * 0.75,
              borderRadius: 8,
            }}
            resizeMode="cover"
            onError={() => setHasError(true)}
            loadingSize="large"
            loadingColor="#F05C0C"
          />
        )}

        {/* Show loading state while fetching authenticated image */}
        {isLoading && !imageSource && !hasError && (
          <View
            style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(240, 240, 240, 0.9)',
            }}
          >
            <ActivityIndicator size="large" color="#F05C0C" />
            <Text style={{ marginTop: 8, color: '#666', fontWeight: '500' }}>
              Loading image...
            </Text>
          </View>
        )}

        {hasError && (
          <View
            style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(240, 240, 240, 0.9)',
            }}
          >
            <MaterialIcons name="image-not-supported" size={32} color="#999" />
            <Text style={{ marginTop: 8, color: '#666', fontWeight: '500' }}>
              Image not available
            </Text>
          </View>
        )}
      </View>
    );
  }
);

ImageAttachment.displayName = 'ImageAttachment';

const GenericFileAttachment = React.memo(
  ({
    attachment,
    maxWidth,
    isSending,
  }: {
    attachment: Attachment;
    maxWidth: number;
    isSending: boolean;
  }) => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
      const checkFileAccess = async () => {
        const fileUri = attachment.localUri as string;
        if (!fileUri) {
          setErrorMessage('File not found');
          return;
        }

        try {
          const canOpen = await Linking.canOpenURL(fileUri);
          if (!canOpen) {
            setErrorMessage('File cannot be opened');
          }
        } catch {
          setErrorMessage('File is inaccessible');
        }
      };

      checkFileAccess();
    }, [attachment.localUri]);

    const handleOpenFile = async () => {
      try {
        const fileUri = attachment.localUri as string;

        if (!fileUri) {
          setErrorMessage('File not found');
          return;
        }

        const canOpen = await Linking.canOpenURL(fileUri);
        if (canOpen) {
          await Linking.openURL(fileUri);
        } else {
          setErrorMessage('Cannot open this file');
        }
      } catch {
        setErrorMessage('Error opening file');
      }
    };

    return (
      <TouchableOpacity
        className="flex-row items-center p-2 bg-gray-50 rounded-lg"
        style={{
          maxWidth,
          marginBottom: 8,
          backgroundColor: isSending ? '#E5E7EB' : '#f0f0f0',
        }}
        onPress={errorMessage ? undefined : handleOpenFile}
        disabled={!!errorMessage || !!isSending}
      >
        <MaterialCommunityIcons
          name={errorMessage ? 'file-alert-outline' : 'file-outline'}
          size={24}
          color={errorMessage ? '#FF3B30' : '#6B7280'}
        />
        <View className="ml-2 flex-1">
          <Text
            className={`text-sm ${errorMessage ? 'text-red-500' : 'text-gray-800'} font-medium`}
            numberOfLines={1}
          >
            {errorMessage ? 'File not found' : attachment.name || 'File'}
          </Text>
          {errorMessage ? (
            <Text className="text-xs text-red-500">
              The file is no longer accessible
            </Text>
          ) : (
            attachment.size && (
              <Text className="text-xs text-gray-500">
                {(attachment.size / 1024).toFixed(1)} KB
              </Text>
            )
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

GenericFileAttachment.displayName = 'GenericFileAttachment';

const AttachmentRenderer: React.FC<AttachmentRendererProps> = ({
  attachments,
  uploadStatus,
  messageId,
  conversationId,
}) => {
  if (!attachments || attachments.length === 0) return null;

  const isSending = uploadStatus === 'sending';

  const imageAttachments: Attachment[] = [];
  const otherAttachments: Attachment[] = [];

  attachments.forEach(attachment => {
    const isImage =
      attachment.type === 'image' ||
      (attachment.mimeType && attachment.mimeType.startsWith('image/')) ||
      (attachment.name &&
        attachment.name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));

    if (isImage) {
      imageAttachments.push(attachment);
    } else {
      otherAttachments.push(attachment);
    }
  });

  const imageUris = imageAttachments
    .map(att => att.uri || att.remoteUri || att.localUri)
    .filter((uri): uri is string => !!uri);

  return (
    <View>
      {imageUris.length > 0 && (
        <ImageGrid
          imageUris={imageUris}
          maxWidth={MAX_ATTACHMENT_WIDTH}
          isSending={isSending}
        />
      )}

      {otherAttachments.map((attachment, index) => {
        const key = `${messageId || 'msg'}-${index}`;
        const uri =
          attachment.uri || attachment.remoteUri || attachment.localUri;

        const isAudio =
          attachment.type === 'audio' ||
          (attachment.mimeType && attachment.mimeType.startsWith('audio/')) ||
          (attachment.name &&
            attachment.name.match(/\.(m4a|mp4|mp3|wav|ogg|webm)$/i));

        const isFile =
          attachment.type === 'file' ||
          (attachment.mimeType &&
            (attachment.mimeType.includes('pdf') ||
              attachment.mimeType.includes('document')));

        if (isAudio) {
          return (
            <AudioAttachment
              key={key}
              attachment={{ ...attachment }}
              isSending={isSending}
              conversationId={conversationId}
            />
          );
        }

        if (isFile) {
          return (
            <FileAttachment
              key={key}
              attachment={{ ...attachment, localUri: uri }}
              maxWidth={MAX_ATTACHMENT_WIDTH}
              isSending={isSending}
              conversationId={conversationId}
            />
          );
        }

        return (
          <GenericFileAttachment
            key={key}
            attachment={{ ...attachment, localUri: uri }}
            maxWidth={MAX_ATTACHMENT_WIDTH}
            isSending={isSending}
          />
        );
      })}
    </View>
  );
};

export default React.memo(AttachmentRenderer);
