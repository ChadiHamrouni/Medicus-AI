import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VitalCard } from './VitalCard';
import { getBMIStatus, VitalType } from './utils';

import type {
  MedicalVitalEntry,
  MedicalVitalsResponse,
} from '@/services/patient/vitals';

interface BodyMetricsProps {
  getLatestVitalEntry: (_type: VitalType) => MedicalVitalEntry | undefined;
  vitalsResponse: MedicalVitalsResponse;
  openHistory: (_type: VitalType) => void;
}

export const BodyMetrics: React.FC<BodyMetricsProps> = ({
  getLatestVitalEntry,
  vitalsResponse,
  openHistory,
}) => {
  const weight = getLatestVitalEntry('weight');
  const bmi = getLatestVitalEntry('bmi');
  const height = getLatestVitalEntry('height');
  const waist = vitalsResponse.body_metrics?.find(
    v => v.vital_name === 'waist_cm'
  );
  const bodyComposition = getLatestVitalEntry('body_composition');

  const hasData = weight || bmi || height || waist || bodyComposition;

  if (!hasData) {
    return (
      <View className="w-full items-center py-12">
        <MaterialCommunityIcons
          name="human-male-height"
          size={48}
          color="#D1D5DB"
        />
        <Text className="text-gray-500 mt-3 text-sm">
          No body metrics available
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {/* Weight */}
      {weight && (
        <VitalCard
          entry={weight}
          icon="weight"
          onPress={() => openHistory('weight')}
        />
      )}

      {/* BMI */}
      {bmi && (
        <VitalCard
          entry={bmi}
          icon="speedometer"
          onPress={() => openHistory('bmi')}
        />
      )}

      {/* Height */}
      {height && (
        <VitalCard
          entry={height}
          icon="human-male-height"
          onPress={() => openHistory('height')}
        />
      )}

      {/* Waist */}
      {waist && (
        <VitalCard entry={waist} icon="tape-measure" onPress={() => { }} />
      )}

      {bodyComposition && (
        <VitalCard
          entry={bodyComposition}
          icon="human-handsup"
          onPress={() => openHistory('body_composition')}
        />
      )}
    </View>
  );
};
