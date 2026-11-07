import React from 'react';
import { View, Text } from 'react-native';

interface MedicationsHeaderProps {
  currentPatientName?: string;
}

export const MedicationsHeader: React.FC<MedicationsHeaderProps> = () => {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        Current Medications
      </Text>
      <Text className="text-sm text-gray-600">
        Your current prescription medications as prescribed by your healthcare
        providers.
      </Text>
    </View>
  );
};
