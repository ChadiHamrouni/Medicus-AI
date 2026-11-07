import { useCallback, useEffect, useState } from 'react';
import { usePatientContext } from './usePatientContext';
import {
  getCurrentMedications,
  getMedicationSummary,
  getPrescriptionHistory,
  getMedicationCategories,
  searchPatientMedications,
  type Medication,
  type CurrentMedicationsResponse,
  type MedicationSummary,
  type PrescriptionRecord,
  type MedicationCategoriesResponse,
} from '@/services';
import { logger } from '@/utils';

interface MedicationsState {
  currentMedications: Medication[];
  medicationSummary: MedicationSummary | null;
  prescriptionHistory: PrescriptionRecord[];
  medicationCategories: MedicationCategoriesResponse | null;
  isLoading: boolean;
  error: string | null;
  activeMedicationsCount: number;
  lastUpdated: string | null;
}

export const useMedications = () => {
  const { currentPatient } = usePatientContext();

  const [state, setState] = useState<MedicationsState>({
    currentMedications: [],
    medicationSummary: null,
    prescriptionHistory: [],
    medicationCategories: null,
    isLoading: false,
    error: null,
    activeMedicationsCount: 0,
    lastUpdated: null,
  });

  // Load current medications
  const loadCurrentMedications = useCallback(async (patientId: number) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await getCurrentMedications(patientId);

      setState(prev => ({
        ...prev,
        currentMedications: response.active_medications.medications || [],
        activeMedicationsCount: response.active_medications.count || 0,
        lastUpdated: response.summary.last_updated,
        isLoading: false,
      }));

      logger.info('Current medications loaded successfully', {
        component: 'useMedications',
        patientId,
        medicationsCount: response.active_medications.count,
      });
    } catch (error: any) {
      const errorMessage =
        error.message || 'Failed to load current medications';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));

      logger.error('Failed to load current medications', error as Error, {
        component: 'useMedications',
        patientId,
      });
    }
  }, []);

  // Load medication summary
  const loadMedicationSummary = useCallback(async (patientId: number) => {
    try {
      const summary = await getMedicationSummary(patientId);

      setState(prev => ({
        ...prev,
        medicationSummary: summary,
      }));

      logger.info('Medication summary loaded successfully', {
        component: 'useMedications',
        patientId,
        totalPrescriptions: summary.total_prescriptions,
      });
    } catch (error: any) {
      logger.error('Failed to load medication summary', error as Error, {
        component: 'useMedications',
        patientId,
      });
    }
  }, []);

  // Load prescription history
  const loadPrescriptionHistory = useCallback(async (patientId: number) => {
    try {
      const history = await getPrescriptionHistory(patientId, 20); // Get last 20 prescriptions

      setState(prev => ({
        ...prev,
        prescriptionHistory: history,
      }));

      logger.info('Prescription history loaded successfully', {
        component: 'useMedications',
        patientId,
        historyCount: history.length,
      });
    } catch (error: any) {
      logger.error('Failed to load prescription history', error as Error, {
        component: 'useMedications',
        patientId,
      });
    }
  }, []);

  // Load medication categories
  const loadMedicationCategories = useCallback(async (patientId: number) => {
    try {
      const categories = await getMedicationCategories(patientId);

      setState(prev => ({
        ...prev,
        medicationCategories: categories,
      }));

      logger.info('Medication categories loaded successfully', {
        component: 'useMedications',
        patientId,
        categoriesCount: categories.total_categories,
      });
    } catch (error: any) {
      logger.error('Failed to load medication categories', error as Error, {
        component: 'useMedications',
        patientId,
      });
    }
  }, []);

  // Search medications for the current patient
  const searchMedications = useCallback(
    async (searchTerm: string) => {
      if (!currentPatient?.id || !searchTerm.trim()) {
        return { medications: [], totalMatches: 0 };
      }

      try {
        const results = await searchPatientMedications(
          currentPatient.id,
          searchTerm.trim(),
          20 // Limit search results
        );

        logger.info('Medication search completed', {
          component: 'useMedications',
          patientId: currentPatient.id,
          searchTerm,
          totalMatches: results.total_matches,
        });

        return {
          medications: results.medications,
          totalMatches: results.total_matches,
          hasMore: results.pagination.has_more,
        };
      } catch (error: any) {
        logger.error('Failed to search medications', error as Error, {
          component: 'useMedications',
          patientId: currentPatient.id,
          searchTerm,
        });

        return { medications: [], totalMatches: 0 };
      }
    },
    [currentPatient?.id]
  );

  // Refresh all medication data
  const refreshMedications = useCallback(async () => {
    if (!currentPatient?.id) {
      setState(prev => ({
        ...prev,
        error: 'No patient selected',
        currentMedications: [],
        activeMedicationsCount: 0,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load all medication data in parallel
      await Promise.allSettled([
        loadCurrentMedications(currentPatient.id),
        loadMedicationSummary(currentPatient.id),
        loadPrescriptionHistory(currentPatient.id),
        loadMedicationCategories(currentPatient.id),
      ]);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load medication data',
        isLoading: false,
      }));

      logger.error('Failed to refresh medications', error as Error, {
        component: 'useMedications',
        patientId: currentPatient.id,
      });
    }
  }, [
    currentPatient?.id,
    loadCurrentMedications,
    loadMedicationSummary,
    loadPrescriptionHistory,
    loadMedicationCategories,
  ]);

  // Auto-load medications when patient changes
  useEffect(() => {
    if (currentPatient?.id) {
      refreshMedications();
    } else {
      // Clear medications when no patient is selected
      setState({
        currentMedications: [],
        medicationSummary: null,
        prescriptionHistory: [],
        medicationCategories: null,
        isLoading: false,
        error: null,
        activeMedicationsCount: 0,
        lastUpdated: null,
      });
    }
  }, [currentPatient?.id, refreshMedications]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Helper to get medications by status
  const getMedicationsByStatus = useCallback(
    (status: 'active' | 'inactive' | 'completed') => {
      return state.currentMedications.filter(med => med.status === status);
    },
    [state.currentMedications]
  );

  // Helper to get medications by category
  const getMedicationsByCategory = useCallback(
    (category: string) => {
      return state.currentMedications.filter(med => med.category === category);
    },
    [state.currentMedications]
  );

  return {
    // State
    currentMedications: state.currentMedications,
    medicationSummary: state.medicationSummary,
    prescriptionHistory: state.prescriptionHistory,
    medicationCategories: state.medicationCategories,
    isLoading: state.isLoading,
    error: state.error,
    activeMedicationsCount: state.activeMedicationsCount,
    lastUpdated: state.lastUpdated,

    // Actions
    refreshMedications,
    searchMedications,
    clearError,

    // Helper functions
    getMedicationsByStatus,
    getMedicationsByCategory,

    // Computed values
    activeMedications: getMedicationsByStatus('active'),
    inactiveMedications: getMedicationsByStatus('inactive'),
    completedMedications: getMedicationsByStatus('completed'),
    hasActiveMedications: state.activeMedicationsCount > 0,
    hasError: !!state.error,
    isEmpty: state.activeMedicationsCount === 0 && !state.isLoading,

    // Patient context info
    currentPatientId: currentPatient?.id || null,
    currentPatientName: currentPatient?.full_name || '',
  };
};

export default useMedications;
