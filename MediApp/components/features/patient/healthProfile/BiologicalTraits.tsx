import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VitalCard } from './VitalCard';
import { VitalType } from './utils';
import type { MedicalVitalEntry } from '@/services/patient/vitals';

interface BiologicalTraitsProps {
  getLatestVitalEntry: (_type: VitalType) => MedicalVitalEntry | undefined;
  openHistory: (_type: VitalType) => void;
}

export const BiologicalTraits: React.FC<BiologicalTraitsProps> = ({
  getLatestVitalEntry,
  openHistory,
}) => {
  const bloodType = getLatestVitalEntry('blood_type');

  if (!bloodType) {
    return (
      <View className="w-full items-center py-12">
        <MaterialCommunityIcons name="dna" size={48} color="#D1D5DB" />
        <Text className="text-gray-500 mt-3 text-sm">
          No biological traits available
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {/* Blood Type */}
      {bloodType && (
        <VitalCard
          entry={bloodType}
          icon="dna"
          onPress={() => openHistory('blood_type')}
        />
      )}
    </View>
  );
};
