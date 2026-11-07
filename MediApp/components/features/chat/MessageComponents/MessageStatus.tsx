import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { formatMessageTimestamp } from '@/utils';

interface MessageStatusProps {
  isUploading?: boolean;
  uploadStatus?: 'sending' | 'failed';
  timestamp: string;
  onRetry?: (_messageId: string) => void;
  messageId?: string;
}

const MessageStatus: React.FC<MessageStatusProps> = ({
  isUploading,
  uploadStatus,
  timestamp,
  onRetry,
  messageId,
}) => {
  const handleRetry = useCallback(() => {
    if (onRetry && messageId) {
      onRetry(messageId);
    }
  }, [onRetry, messageId]);

  if (isUploading && uploadStatus === 'sending') {
    return (
      <View className="flex-row items-center">
        <ActivityIndicator size="small" color="#9CA3AF" />
        {/* <Text className="text-xs text-gray-500 ml-1">Sending...</Text> */}
      </View>
    );
  }

  if (uploadStatus === 'failed' && onRetry && messageId) {
    return (
      <TouchableOpacity onPress={handleRetry} className="flex-row items-center">
        <MaterialIcons name="refresh" size={12} color="#EF4444" />
        <Text className="text-xs text-red-500 ml-1">Tap to retry</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Text className="text-xs text-gray-500">
      {formatMessageTimestamp(timestamp)}
    </Text>
  );
};

export default React.memo(MessageStatus);
