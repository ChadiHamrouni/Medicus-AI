import React from 'react';
import { View, Text } from 'react-native';

interface MedicalHistoryHeaderProps {
  currentPatientName?: string;
}

export const MedicalHistoryHeader: React.FC<MedicalHistoryHeaderProps> = ({
  currentPatientName: _currentPatientName,
}) => {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        Medical History
      </Text>
      <Text className="text-sm text-gray-600">
        Your past medical visits and records from healthcare providers.
      </Text>
    </View>
  );
};
