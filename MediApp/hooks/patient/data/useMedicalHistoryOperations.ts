import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDependents } from '@/contexts/DependentsContext';
import { usePatientStore, type MedicalVisitData } from '@/stores/patientStore';
import { logger } from '@/utils';

export const useMedicalHistoryOperations = () => {
  const { refreshDependents } = useDependents();
  const { saveMedicalHistoryData, isSaving, error } = usePatientStore();

  const handleSaveMedicalHistory = useCallback(
    async (
      visits: MedicalVisitData[],
      _currentPatient: any,
      selectedDependent: any,
      _isDependentContext: boolean
    ) => {
      // Generate patient ID for store operations
      const patientId =
        selectedDependent === 'main' ? 'main' : String(selectedDependent);

      // Use Zustand store to save with optimistic updates
      const success = await saveMedicalHistoryData(patientId, visits);

      if (success) {
        // Refresh dependents data after successful update
        await refreshDependents();

        const visitsCount = visits.length;

        Alert.alert(
          'Success',
          `${visitsCount} visit${visitsCount !== 1 ? 's' : ''} updated successfully!`
        );
      } else {
        const errorMessage =
          error ||
          'Failed to update medical history information. Please try again.';
        Alert.alert('Error', errorMessage);
      }

      return success;
    },
    [saveMedicalHistoryData, refreshDependents, error]
  );

  const handleAddVisit = useCallback(
    async (
      newVisit: MedicalVisitData,
      currentVisits: MedicalVisitData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedVisits = [...currentVisits, newVisit];
      return await handleSaveMedicalHistory(
        updatedVisits,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedicalHistory]
  );

  const handleUpdateVisit = useCallback(
    async (
      updatedVisit: MedicalVisitData,
      currentVisits: MedicalVisitData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedVisits = currentVisits.map(visit =>
        visit.visit_id === updatedVisit.visit_id ? updatedVisit : visit
      );
      return await handleSaveMedicalHistory(
        updatedVisits,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedicalHistory]
  );

  const handleDeleteVisit = useCallback(
    async (
      visitId: number,
      currentVisits: MedicalVisitData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedVisits = currentVisits.filter(
        visit => visit.visit_id !== visitId
      );
      return await handleSaveMedicalHistory(
        updatedVisits,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedicalHistory]
  );

  const handleUpdateVisitType = useCallback(
    async (
      visitId: number,
      newVisitType: string,
      currentVisits: MedicalVisitData[],
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      const updatedVisits = currentVisits.map(visit =>
        visit.visit_id === visitId
          ? { ...visit, visit_type: newVisitType }
          : visit
      );
      return await handleSaveMedicalHistory(
        updatedVisits,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveMedicalHistory]
  );

  const refreshMedicalHistory = useCallback(
    async (selectedDependent: any) => {
      try {
        logger.info('Refreshing medical history data', {
          component: 'useMedicalHistoryOperations',
          selectedDependent,
        });

        await refreshDependents();

        return true;
      } catch (error) {
        logger.error('Failed to refresh medical history:', error as Error, {
          component: 'useMedicalHistoryOperations',
          selectedDependent,
        });
        return false;
      }
    },
    [refreshDependents]
  );

  return {
    handleSaveMedicalHistory,
    handleAddVisit,
    handleUpdateVisit,
    handleDeleteVisit,
    handleUpdateVisitType,
    refreshMedicalHistory,
    isSaving,
  };
};
