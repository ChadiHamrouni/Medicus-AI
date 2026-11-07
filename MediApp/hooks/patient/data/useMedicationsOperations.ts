import { useCallback } from 'react';
import { Alert } from 'react-native';
import { usePatientStore, type MedicationData } from '@/stores/patientStore';
import { logger } from '@/utils';

export const useMedicationsOperations = () => {
  const { saveMedicationsData, isSaving, error } = usePatientStore();

  const handleSaveMedications = useCallback(
    async (
      medications: MedicationData[],
      _currentPatient: any,
      selectedDependent: any,
      _isDependentContext: boolean
    ) => {
      // Generate patient ID for store operations
      const patientId =
        selectedDependent === 'main' ? 'main' : String(selectedDependent);

      // Use Zustand store to save with optimistic updates
      const success = await saveMedicationsData(patientId, medications);

      if (success) {
        const medicationsCount = medications.length;
        const activeMedicationsCount = medications.filter(
          med => med.status === 'current'
        ).length;

        Alert.alert(
          'Success',
          `${medicationsCount} medication${medicationsCount !== 1 ? 's' : ''} updated successfully! (${activeMedicationsCount} current)`
        );
      } else {
        const errorMessage =
          error ||
          'Failed to update medications information. Please try again.';
        Alert.alert('Error', errorMessage);
      }

      return success;
    },
    [saveMedicationsData, error]
  );

  const handleAddMedication = useCallback(
    async (
      newMedication: MedicationData,
      currentMedications: MedicationData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedMedications = [...currentMedications, newMedication];
      return await handleSaveMedications(
        updatedMedications,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedications]
  );

  const handleUpdateMedication = useCallback(
    async (
      updatedMedication: MedicationData,
      currentMedications: MedicationData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedMedications = currentMedications.map(med =>
        med.id === updatedMedication.id ? updatedMedication : med
      );
      return await handleSaveMedications(
        updatedMedications,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedications]
  );

  const handleDeleteMedication = useCallback(
    async (
      medicationId: number,
      currentMedications: MedicationData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedMedications = currentMedications.filter(
        med => med.id !== medicationId
      );
      return await handleSaveMedications(
        updatedMedications,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedications]
  );

  const handleUpdateMedicationStatus = useCallback(
    async (
      medicationId: number,
      newStatus: 'current' | 'previous',
      currentMedications: MedicationData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedMedications = currentMedications.map(med =>
        med.id === medicationId ? { ...med, status: newStatus } : med
      );
      return await handleSaveMedications(
        updatedMedications,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedications]
  );

  const refreshMedications = useCallback(async (selectedDependent: any) => {
    try {
      logger.info('Refreshing medications data', {
        component: 'useMedicationsOperations',
        selectedDependent,
      });

      const patientId =
        selectedDependent === 'main' ? 'main' : String(selectedDependent);

      const { loadMedicationsOnly } = usePatientStore.getState();

      const actualPatientId =
        selectedDependent === 'main'
          ? selectedDependent
          : Number(selectedDependent);

      await loadMedicationsOnly(patientId, actualPatientId);

      return true;
    } catch (error) {
      logger.error('Failed to refresh medications:', error as Error, {
        component: 'useMedicationsOperations',
        selectedDependent,
      });
      return false;
    }
  }, []);

  return {
    handleSaveMedications,
    handleAddMedication,
    handleUpdateMedication,
    handleDeleteMedication,
    handleUpdateMedicationStatus,
    refreshMedications,
    isSaving,
  };
};
