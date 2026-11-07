import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MedicalHistoryEmptyStateProps {
  currentPatientName?: string;
}

export const MedicalHistoryEmptyState: React.FC<
  MedicalHistoryEmptyStateProps
> = ({ currentPatientName }) => {
  return (
    <View className="bg-gray-50 rounded-xl p-8 items-center border border-gray-200">
      <MaterialCommunityIcons name="history" size={64} color="#9CA3AF" />
      <Text className="text-lg font-semibold text-gray-600 mt-4 mb-2">
        No Medical History Found
      </Text>
      <Text className="text-sm text-gray-500 text-center">
        Your past medical visits and records will appear here when available.
      </Text>
      {currentPatientName && (
        <Text className="text-sm text-gray-400 text-center mt-2">
          No medical history found for {currentPatientName}
        </Text>
      )}
    </View>
  );
};
