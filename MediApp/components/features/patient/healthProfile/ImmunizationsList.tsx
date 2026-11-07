import React from 'react';
import { View } from 'react-native';
import { VaccineCard } from './VaccineCard';
import { HealthProfileEmptyState } from './HealthProfileEmptyState';
interface ImmunizationsListProps {
  vitalsRecords: any[];
  isLoading: boolean;
  onVaccinePress: (_vaccine: any, _record: any) => void;
}

export const ImmunizationsList: React.FC<ImmunizationsListProps> = ({
  vitalsRecords,
  isLoading,
  onVaccinePress,
}) => {
  // Get immunizations from the first record that has them
  const immunizations = vitalsRecords.find(r => r.medical_data?.immunizations)
    ?.medical_data?.immunizations;

  if (
    !immunizations ||
    !Array.isArray(immunizations) ||
    immunizations.length === 0
  ) {
    return (
      <HealthProfileEmptyState
        isLoading={isLoading}
        icon="needle"
        message="No vaccination records"
      />
    );
  }

  // Get the record that contains immunizations to access doctor/provider info
  const immunizationRecord = vitalsRecords.find(
    r => r.medical_data?.immunizations
  );

  return (
    <View>
      {immunizations.map((vaccine: any, index: number) => (
        <VaccineCard
          key={index}
          vaccine={vaccine}
          isLast={index === immunizations.length - 1}
          onPress={() => {
            onVaccinePress(
              {
                ...vaccine,
                doctor_name: immunizationRecord?.doctor_name,
                healthcare_provider_name:
                  immunizationRecord?.healthcare_provider_name,
              },
              immunizationRecord
            );
          }}
        />
      ))}
    </View>
  );
};
