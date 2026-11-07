import type { ConversationSummary } from '@/types';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface AISummaryModalProps {
  visible: boolean;
  onClose: () => void;
  summaryData: ConversationSummary | null;
}

export const AISummaryModal: React.FC<AISummaryModalProps> = ({
  visible,
  onClose,
  summaryData,
}) => {
  if (!summaryData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900">
            ✨ AI Summary
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="bg-gray-100 rounded-full w-8 h-8 items-center justify-center"
          >
            <Text className="text-gray-600 font-bold">×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Main Summary */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Summary
            </Text>
            <Text className="text-gray-700 leading-6">
              {summaryData.summary_text}
            </Text>
          </View>

          {/* Key Symptoms */}
          {summaryData.key_symptoms && summaryData.key_symptoms.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Key Symptoms
              </Text>
              {summaryData.key_symptoms.map((symptom, index) => (
                <View key={index} className="flex-row mb-2">
                  <Text className="text-red-500 mr-2">•</Text>
                  <Text className="text-gray-700 flex-1 leading-6">
                    {symptom}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Urgency Level */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Urgency Level
            </Text>
            <View
              className={`rounded-full px-4 py-2 self-start ${
                summaryData.urgency_level.toLowerCase() === 'high'
                  ? 'bg-red-100'
                  : summaryData.urgency_level.toLowerCase() === 'medium'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
              }`}
            >
              <Text
                className={`font-medium ${
                  summaryData.urgency_level.toLowerCase() === 'high'
                    ? 'text-red-800'
                    : summaryData.urgency_level.toLowerCase() === 'medium'
                      ? 'text-yellow-800'
                      : 'text-green-800'
                }`}
              >
                {summaryData.urgency_level}
              </Text>
            </View>
          </View>

          {/* Message Count */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Conversation Stats
            </Text>
            <Text className="text-gray-700">
              Total messages: {summaryData.message_count}
            </Text>
          </View>

          {/* Timestamp */}
          <View className="border-t border-gray-200 pt-4">
            <Text className="text-sm text-gray-500">
              Summary generated:{' '}
              {new Date(summaryData.generated_at).toLocaleString()}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
