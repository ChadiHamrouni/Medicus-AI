import React from 'react';
import { View } from 'react-native';
import { VitalCard } from './VitalCard';
import type { MedicalVitalEntry } from '@/services/patient/vitals';

interface VitalsGridProps {
  vitalsEntries: MedicalVitalEntry[];
  onVitalPress: (entry: MedicalVitalEntry) => void;
}

const VITAL_ICON_MAP: Record<string, string> = {
  blood_pressure: 'heart',
  systolic: 'heart',
  diastolic: 'heart',
  resting_heart_rate: 'heart-pulse',
  heart_rate: 'heart-pulse',
  oxygen_saturation: 'lungs',
  temperature_c: 'thermometer',
  blood_glucose_mg_dl: 'water',
  respiratory_rate: 'air-filter',
  pain_score: 'bandage',
};

export const VitalsGrid: React.FC<VitalsGridProps> = ({
  vitalsEntries,
  onVitalPress,
}) => {
  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {vitalsEntries.map(entry => (
        <VitalCard
          key={`${entry.id}-${entry.vital_name}`}
          entry={entry}
          icon={VITAL_ICON_MAP[entry.vital_category] || 'heart-pulse'}
          onPress={() => onVitalPress(entry)}
        />
      ))}
    </View>
  );
};
