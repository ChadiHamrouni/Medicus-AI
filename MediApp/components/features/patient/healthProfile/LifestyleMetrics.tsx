import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VitalCard } from './VitalCard';
import { ThreeDotsLoader } from '@/components/shared/ui';
import { VitalType } from './utils';

import type { MedicalVitalsResponse } from '@/services/patient/vitals';

interface LifestyleMetricsProps {
  vitalsResponse: MedicalVitalsResponse;
  isLoading: boolean;
  openHistory: (_type: VitalType) => void;
}

const LIFESTYLE_ICON_MAP: Record<string, string> = {
  steps: 'walk',
  sleep_hours: 'sleep',
  sleep: 'sleep',
  calories_burned: 'fire',
  hydration_liters: 'cup-water',
  stress_level: 'emoticon-stressed',
  exercise_frequency: 'dumbbell',
  smoking_status: 'smoking',
  alcohol_use: 'glass-cocktail',
  diet_type: 'food-apple',
  diet_notes: 'note-text',
};

export const LifestyleMetrics: React.FC<LifestyleMetricsProps> = ({
  vitalsResponse,
  isLoading,
  openHistory,
}) => {
  const lifestyleEntries = vitalsResponse?.lifestyle || [];

  if (lifestyleEntries.length === 0) {
    if (isLoading) {
      return (
        <View className="w-full items-center py-12">
          <ThreeDotsLoader size={14} />
        </View>
      );
    }
    return (
      <View className="w-full items-center py-12">
        <MaterialCommunityIcons name="run" size={48} color="#D1D5DB" />
        <Text className="text-gray-500 mt-3 text-sm">
          No lifestyle data available
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {lifestyleEntries.map(entry => (
        <VitalCard
          key={entry.id}
          entry={entry}
          icon={LIFESTYLE_ICON_MAP[entry.vital_name] || 'run'}
          onPress={() => openHistory(entry.vital_name as VitalType)}
        />
      ))}
    </View>
  );
};
