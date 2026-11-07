import React, { useState } from 'react';
import { View } from 'react-native';
import {
  useMedicationsData,
  useMedicationsOperations,
} from '@/hooks/patient/data';
import { MedicationsSection } from './MedicationsSection';
import { InfoNotice } from '@/components/shared/ui/InfoNotice';
import { MedicationsEmptyState } from './MedicationsEmptyState';
import { MedicationsErrorState } from './MedicationsErrorState';
import { MedicationsTabs } from './MedicationsTabs';
import { logger } from '@/utils';
import { ThreeDotsLoader } from '@/components/shared';

export const MedicationsForm: React.FC = () => {
  const {
    medicationsData,
    isLoading: isLoadingData,
    selectedDependent,
    error,
    activeMedications,
    inactiveMedications,
    completedMedications,
    hasActiveMedications,
    isEmpty,
    currentPatientName,
    currentPatientId,
  } = useMedicationsData();

  const { refreshMedications, isSaving } = useMedicationsOperations();
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');

  // Log component mount and patient info
  React.useEffect(() => {
    logger.info('MedicationsForm mounted', {
      component: 'MedicationsForm',
      patientId: currentPatientId,
      patientName: currentPatientName,
    });
  }, [currentPatientId, currentPatientName]);

  const isLoading = isLoadingData || isSaving;

  const handleRefresh = async () => {
    await refreshMedications(selectedDependent);
  };

  const clearError = () => {
    logger.info('Clear error requested', { component: 'MedicationsForm' });
  };

  // Calculate previous medications count
  const previousMedicationsCount =
    inactiveMedications.length + completedMedications.length;
  const hasPreviousMedications = previousMedicationsCount > 0;

  // Show skeleton while fetching medications data
  if (isLoadingData) {
    return <ThreeDotsLoader size={24} />;
  }

  // Error state
  if (error) {
    return (
      <MedicationsErrorState
        error={error}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onClearError={clearError}
      />
    );
  }

  // Empty state - no medications at all
  if (isEmpty && !hasPreviousMedications) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="px-4 py-6">
          <MedicationsEmptyState currentPatientName={currentPatientName} />
          <InfoNotice
            title="AI-Managed Prescriptions"
            message="Your medications are automatically updated by your healthcare providers through our AI system. Always follow the prescribed dosage and timing."
            iconName="information"
            iconColor="#2563EB"
            backgroundColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-800"
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Tabs */}
      <MedicationsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentCount={medicationsData.activeMedicationsCount}
        previousCount={previousMedicationsCount}
      />

      <View className="px-4 py-6">
        {/* Current Medications Tab */}
        {activeTab === 'current' && (
          <>
            {hasActiveMedications ? (
              <MedicationsSection
                title=""
                medications={activeMedications}
                count={medicationsData.activeMedicationsCount}
                isLoading={isLoading}
                onRefresh={handleRefresh}
                showCount={false}
              />
            ) : (
              <View className="py-8">
                <MedicationsEmptyState
                  currentPatientName={currentPatientName}
                  message="No current medications. Check the 'Previous' tab for past prescriptions."
                />
              </View>
            )}
          </>
        )}

        {/* Previous Medications Tab */}
        {activeTab === 'previous' && (
          <>
            {hasPreviousMedications ? (
              <MedicationsSection
                title=""
                medications={[...inactiveMedications, ...completedMedications]}
                count={previousMedicationsCount}
                isLoading={isLoading}
                onRefresh={handleRefresh}
                showCount={false}
              />
            ) : (
              <View className="py-8">
                <MedicationsEmptyState
                  currentPatientName={currentPatientName}
                  message="No previous medications found."
                />
              </View>
            )}
          </>
        )}

        {/* Information Notice */}
        <InfoNotice
          title="AI-Managed Prescriptions"
          message="Your medications are automatically updated by your healthcare providers through our AI system. Always follow the prescribed dosage and timing."
          iconName="information"
          iconColor="#2563EB"
          backgroundColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-800"
        />
      </View>
    </View>
  );
};
