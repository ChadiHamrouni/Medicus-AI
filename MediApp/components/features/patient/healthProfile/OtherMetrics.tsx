import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VitalCard } from './VitalCard';
import { ThreeDotsLoader } from '@/components/shared/ui';
import { VitalType } from './utils';

import type { MedicalVitalsResponse } from '@/services/patient/vitals';

interface OtherMetricsProps {
  vitalsResponse: MedicalVitalsResponse;
  isLoading: boolean;
  openHistory: (_type: VitalType) => void;
}

export const OtherMetrics: React.FC<OtherMetricsProps> = ({
  vitalsResponse,
  isLoading,
  openHistory,
}) => {
  const otherEntries = vitalsResponse?.other || [];
  console.log(
    'OtherMetrics render. Entries:',
    otherEntries.length,
    JSON.stringify(otherEntries, null, 2)
  );

  if (otherEntries.length === 0) {
    if (isLoading) {
      return (
        <View className="w-full items-center py-12">
          <ThreeDotsLoader size={14} />
        </View>
      );
    }
    return (
      <View className="w-full items-center py-12">
        <MaterialCommunityIcons
          name="clipboard-text-outline"
          size={48}
          color="#D1D5DB"
        />
        <Text className="text-gray-500 mt-3 text-sm">
          No other vitals recorded
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {otherEntries.map((entry, index) => (
        <VitalCard
          key={`${entry.id}-${index}`}
          entry={entry}
          icon="clipboard-pulse-outline" // Generic icon for "other"
          onPress={() => openHistory(entry.vital_name as VitalType)}
        />
      ))}
    </View>
  );
};
