import { useEffect } from 'react';
import { useDependents } from '@/contexts/DependentsContext';
import { usePatientView } from '@/contexts/PatientViewContext';
import { usePatientStore, type MedicationsData } from '@/stores/patientStore';
import { MedicationUtils } from '@/utils';

export const useMedicationsData = () => {
  const {
    selectedDependent,
    isLoading: isDependentsLoading,
  } = useDependents();

  // Use centralized patient view context for patient ID
  const { patientId: contextPatientId, isViewingAsDoctor } = usePatientView();

  // Get data and actions from Zustand store
  const {
    getMedicationsData,
    loadMedicationsOnly,
    updateMedicationsDataOptimistic,
    isLoading: isLoadingStore,
    error,
  } = usePatientStore();

  // Generate patient ID for store operations (string key for the store)
  const patientId = isViewingAsDoctor
    ? String(contextPatientId)
    : selectedDependent === 'main' ? 'main' : String(selectedDependent);

  // The actual numeric patient ID for API calls comes from context
  const currentPatientId = contextPatientId;

  const cachedMedicationsData = getMedicationsData(patientId);
  const medicationsData: MedicationsData = {
    currentMedications: cachedMedicationsData?.currentMedications || [],
    activeMedicationsCount: cachedMedicationsData?.activeMedicationsCount || 0,
    lastUpdated: cachedMedicationsData?.lastUpdated || null,
  };

  const hasNoData =
    !cachedMedicationsData ||
    (medicationsData.currentMedications.length === 0 &&
      !medicationsData.lastUpdated);

  // Determine if we're in dependent context (not 'main' and not viewing as doctor)
  const isDependentContext = !isViewingAsDoctor && selectedDependent !== 'main';

  // Load medications data when patient changes (either via dependent switch or doctor viewing patient)
  useEffect(() => {
    if (currentPatientId) {
      loadMedicationsOnly(patientId, currentPatientId);
    }
  }, [patientId, currentPatientId, loadMedicationsOnly]);

  // Preload doctor names when medications are available
  useEffect(() => {
    if (medicationsData.currentMedications.length > 0) {
      MedicationUtils.preloadDoctorNames(medicationsData.currentMedications);
    }
  }, [medicationsData.currentMedications]);

  // Create a setter function that updates the store optimistically
  const setMedicationsData = (
    updatesOrFn:
      | Partial<MedicationsData>
      | ((_prev: MedicationsData) => MedicationsData)
  ) => {
    let updates: Partial<MedicationsData>;

    if (typeof updatesOrFn === 'function') {
      updates = updatesOrFn(medicationsData);
    } else {
      updates = updatesOrFn;
    }

    updateMedicationsDataOptimistic(patientId, updates);
  };

  // Helper functions to get medications by status
  const getMedicationsByStatus = (status: 'current' | 'previous') => {
    return medicationsData.currentMedications.filter(
      med => med.status === status
    );
  };

  // Helper functions to get medications by category
  const getMedicationsByCategory = (category: string) => {
    return medicationsData.currentMedications.filter(
      med => med.category === category
    );
  };

  // Computed values using new semantic projection statuses
  const currentMedications = getMedicationsByStatus('current');
  const previousMedications = getMedicationsByStatus('previous');

  // Legacy aliases for backward compatibility
  const activeMedications = currentMedications;
  const pastMedications = previousMedications;
  const inactiveMedications: typeof previousMedications = []; // No longer used
  const completedMedications: typeof previousMedications = []; // No longer used
  const hasActiveMedications = medicationsData.activeMedicationsCount > 0;
  const isEmpty =
    medicationsData.activeMedicationsCount === 0 && !isLoadingStore;

  return {
    medicationsData,
    setMedicationsData,
    isLoading:
      isLoadingStore ||
      isDependentsLoading ||
      (hasNoData && selectedDependent !== null),
    isDependentContext,
    currentPatient: null,
    selectedDependent,
    error,

    // Helper functions
    getMedicationsByStatus,
    getMedicationsByCategory,

    // Computed values
    activeMedications,
    pastMedications,
    inactiveMedications,
    completedMedications,
    hasActiveMedications,
    isEmpty,

    // Patient context info
    currentPatientId: selectedDependent === 'main' ? 'main' : selectedDependent,
    currentPatientName: isDependentContext
      ? `Dependent ${selectedDependent}`
      : 'Main Patient', // This could be enhanced with actual names
  };
};
