import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Attachment } from '@/types';
import AudioAttachment from './AudioAttachment';
import { authenticatedFetch } from '@/utils';
import { useRouter } from 'expo-router';

type FileAttachmentProps = {
  attachment: Attachment;
  maxWidth: number;
  isSending: boolean;
  conversationId?: string;
};

const FileAttachment: React.FC<FileAttachmentProps> = ({
  attachment,
  maxWidth,
  isSending,
  conversationId,
}) => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (attachment.type === 'audio') {
    return (
      <AudioAttachment
        attachment={attachment}
        isSending={isSending}
        conversationId={conversationId}
      />
    );
  }

  async function handleOpenFile() {
    try {
      // Use uri, remoteUri, or localUri in that order of preference
      // Use uri, remoteUri, or localUri in that order of preference
      const fileUri = (attachment.uri ||
        attachment.remoteUri ||
        attachment.localUri) as string;

      // Check for PDF
      const isPdf =
        attachment.mimeType === 'application/pdf' ||
        (attachment.name && attachment.name.toLowerCase().endsWith('.pdf')) ||
        (fileUri && fileUri.toLowerCase().endsWith('.pdf'));

      if (isPdf && fileUri) {
        router.push({
          pathname: '/viewers/pdf-viewer',
          params: { uri: fileUri, title: attachment.name || 'PDF Document' },
        });
        return;
      }

      // Check if fileUri is empty or undefined
      if (!fileUri) {
        setErrorMessage('File not found');
        return;
      }

      // Check if this is a MedicusConvo stream URL that needs auth
      if (fileUri.includes('/media/') && fileUri.includes('/stream')) {
        try {
          const response = await authenticatedFetch(fileUri);

          if (response.ok) {
            const blob = await response.blob();
            const base64 = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            // Open the base64 data URL
            const canOpen = await Linking.canOpenURL(base64);
            if (canOpen) {
              await Linking.openURL(base64);
            } else {
              setErrorMessage('Cannot open this file');
            }
            return;
          }
        } catch (error) {
          console.warn(
            'Authenticated fetch failed for file attachment:',
            error
          );
        }
      }

      // For regular URIs or if auth fails, use the URI directly
      const canOpen = await Linking.canOpenURL(fileUri);
      if (canOpen) {
        await Linking.openURL(fileUri);
      } else {
        setErrorMessage('Cannot open this file');
      }
    } catch (error) {
      setErrorMessage('Error opening file');
      console.error('Error opening file:', error);
    }
  }

  if (errorMessage) {
    return (
      <View
        className="mb-2"
        style={{ width: maxWidth, height: maxWidth * 0.75 }}
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(240, 240, 240, 0.9)',
            borderRadius: 8,
          }}
        >
          <MaterialCommunityIcons name="file-alert" size={32} color="#FF3B30" />
          <Text style={{ marginTop: 8, color: '#FF3B30', fontWeight: '500' }}>
            File not found
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: '#666',
              fontSize: 12,
              textAlign: 'center',
              paddingHorizontal: 16,
            }}
          >
            The file is no longer accessible
          </Text>
        </View>
      </View>
    );
  }

  const getFileIcon = () => {
    if (attachment.type === 'audio') {
      return {
        name: 'volume-high' as const,
        color: '#10B981',
        bgColor: '#D1FAE5',
      };
    }
    return {
      name: 'file-pdf-box' as const,
      color: '#F05C0C',
      bgColor: '#ffffff',
    };
  };

  const iconConfig = getFileIcon();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      className="flex-row items-center p-3 bg-gray-100 rounded-xl"
      style={{
        maxWidth,
        marginBottom: 8,
        backgroundColor: isSending ? '#E5E7EB' : '#f3f4f6',
      }}
      onPress={
        errorMessage ? undefined : isSending ? undefined : handleOpenFile
      }
      disabled={!!errorMessage || isSending}
    >
      <View
        className="w-[40px] h-[40px] rounded-lg justify-center items-center border border-gray-200"
        style={{ backgroundColor: iconConfig.bgColor }}
      >
        <MaterialCommunityIcons
          name={iconConfig.name}
          size={24}
          color={iconConfig.color}
        />
      </View>

      <View className="ml-3 flex-1">
        <Text
          className={`text-sm ${errorMessage ? 'text-red-500' : 'text-gray-800'} font-medium`}
          numberOfLines={1}
        >
          {attachment.type === 'audio'
            ? 'Voice Message'
            : attachment.name || 'Document'}
        </Text>

        <View className="flex-row items-center mt-1">
          {attachment.type === 'audio' && attachment.duration ? (
            <Text className="text-xs text-gray-500">
              {formatDuration(attachment.duration)}
            </Text>
          ) : attachment.size ? (
            <Text className="text-xs text-gray-500">
              {(attachment.size / 1024).toFixed(1)} KB
            </Text>
          ) : null}

          <Text className="text-xs text-blue-500 ml-auto">Tap to open</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default FileAttachment;
