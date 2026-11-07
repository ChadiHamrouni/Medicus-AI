import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MedicationsEmptyStateProps {
  currentPatientName?: string;
  message?: string;
}

export const MedicationsEmptyState: React.FC<MedicationsEmptyStateProps> = ({
  currentPatientName,
  message,
}) => {
  const defaultMessage =
    'Your prescribed medications will appear here when added by your healthcare provider.';

  return (
    <View className="bg-gray-50 rounded-xl p-8 items-center border border-gray-200">
      <MaterialCommunityIcons name="medical-bag" size={64} color="#9CA3AF" />
      <Text className="text-lg font-semibold text-gray-600 mt-4 mb-2">
        No Medications Found
      </Text>
      <Text className="text-sm text-gray-500 text-center">
        {message || defaultMessage}
      </Text>
      {currentPatientName && !message && (
        <Text className="text-sm text-gray-400 text-center mt-2">
          No medications found for {currentPatientName}
        </Text>
      )}
    </View>
  );
};
