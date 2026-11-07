import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Attachment } from '@/types';

interface AudioAttachmentPreviewProps {
  attachment: Attachment;
}

/**
 * Compact preview component for audio attachments in the input area
 * Shows a small waveform visualization and duration
 */
export const AudioAttachmentPreview: React.FC<AudioAttachmentPreviewProps> = ({
  attachment,
}) => {
  // Format duration from milliseconds to MM:SS
  const formatDuration = (ms?: number) => {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View
      className="bg-white rounded-lg p-2 border border-gray-200"
      style={{ width: 100, height: 80 }}
    >
      {/* Microphone icon */}
      <View className="flex-row items-center mb-1">
        <View
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: '#F05C0C' }}
        >
          <Ionicons name="mic" size={12} color="#FFFFFF" />
        </View>
        <Text className="text-xs text-gray-600 ml-1.5 font-medium">Voice</Text>
      </View>

      {/* Compact waveform visualization */}
      <View className="flex-row items-center justify-center h-6 mb-1">
        {(attachment.waveform || []).slice(0, 15).map((height, index) => (
          <View
            key={index}
            className="w-0.5 bg-gray-300 rounded-full mx-0.5"
            style={{
              height: Math.max(2, Math.min(height * 0.15, 16)),
            }}
          />
        ))}
        {(!attachment.waveform || attachment.waveform.length === 0) &&
          // Default bars if no waveform data
          Array.from({ length: 15 }).map((_, index) => (
            <View
              key={index}
              className="w-0.5 rounded-full mx-0.5"
              style={{
                height: 8,
                backgroundColor: '#F05C0C',
                opacity: 0.3,
              }}
            />
          ))}
      </View>

      {/* Duration */}
      <Text className="text-xs text-gray-500 text-center font-mono">
        {formatDuration(attachment.duration)}
      </Text>
    </View>
  );
};
