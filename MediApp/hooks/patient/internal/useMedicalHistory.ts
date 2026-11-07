import { useCallback, useEffect, useState } from 'react';
import { usePatientContext } from './usePatientContext';
import { getMedicalHistory } from '@/services';
import {
  MedicalHistoryRecord,
  MedicalHistorySummary,
  MedicalRecordType,
} from '@/types';
import { logger } from '@/utils';

interface MedicalHistoryState {
  records: MedicalHistoryRecord[];
  summary: MedicalHistorySummary | null;
  isLoading: boolean;
  error: string | null;
  selectedFilter: string;
}

export const useMedicalHistory = () => {
  const { currentPatient } = usePatientContext();

  const [state, setState] = useState<MedicalHistoryState>({
    records: [],
    summary: null,
    isLoading: false,
    error: null,
    selectedFilter: 'all',
  });

  // Load medical history with optional filters
  const loadMedicalHistory = useCallback(
    async (
      patientId: number,
      filters?: {
        startDate?: string;
        endDate?: string;
        recordTypes?: string[];
        limit?: number;
        offset?: number;
      }
    ) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const response = await getMedicalHistory(patientId, filters);

        setState(prev => ({
          ...prev,
          records: response.records || [],
          summary: response.summary || null,
          isLoading: false,
        }));

        logger.info('Medical history loaded successfully', {
          component: 'useMedicalHistory',
          patientId,
          totalRecords: response.summary?.total_records || 0,
        });
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load medical history';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));

        logger.error('Failed to load medical history', error as Error, {
          component: 'useMedicalHistory',
          patientId,
        });
      }
    },
    []
  );

  // Refresh medical history
  const refreshMedicalHistory = useCallback(async () => {
    if (!currentPatient?.id) {
      setState(prev => ({
        ...prev,
        error: 'No patient selected',
        records: [],
        summary: null,
      }));
      return;
    }

    await loadMedicalHistory(currentPatient.id);
  }, [currentPatient?.id, loadMedicalHistory]);

  // Filter records by type
  const filterRecordsByType = useCallback(
    (type: string) => {
      setState(prev => ({ ...prev, selectedFilter: type }));

      if (type === 'all') {
        return state.records;
      }

      return state.records.filter(record => record.type === type);
    },
    [state.records]
  );

  // Auto-load medical history when patient changes
  useEffect(() => {
    if (currentPatient?.id) {
      refreshMedicalHistory();
    } else {
      // Clear history when no patient is selected
      setState({
        records: [],
        summary: null,
        isLoading: false,
        error: null,
        selectedFilter: 'all',
      });
    }
  }, [currentPatient?.id, refreshMedicalHistory]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get filtered records based on current filter
  const getFilteredRecords = useCallback(() => {
    if (state.selectedFilter === 'all') {
      return state.records;
    }
    return state.records.filter(record => record.type === state.selectedFilter);
  }, [state.records, state.selectedFilter]);

  // Helper functions to get records by type
  const getRecordsByType = useCallback(
    (type: MedicalRecordType) => {
      return state.records.filter(record => record.type === type);
    },
    [state.records]
  );

  const getRecordsByStatus = useCallback(
    (status: 'completed' | 'pending' | 'scheduled') => {
      return state.records.filter(record => record.status === status);
    },
    [state.records]
  );

  // Count records by type
  const countRecordsByType = useCallback(
    (type: MedicalRecordType) => {
      return state.records.filter(record => record.type === type).length;
    },
    [state.records]
  );

  return {
    // State
    records: state.records,
    summary: state.summary,
    isLoading: state.isLoading,
    error: state.error,
    selectedFilter: state.selectedFilter,

    // Actions
    refreshMedicalHistory,
    filterRecordsByType,
    clearError,
    loadMedicalHistory,

    // Helper functions
    getFilteredRecords,
    getRecordsByType,
    getRecordsByStatus,
    countRecordsByType,

    // Computed values
    filteredRecords: getFilteredRecords(),
    visits: getRecordsByType('visit'),
    tests: getRecordsByType('test'),
    procedures: getRecordsByType('procedure'),
    imaging: getRecordsByType('imaging'),
    diagnoses: getRecordsByType('diagnosis'),
    hospitalizations: getRecordsByType('hospitalization'),
    prescriptions: getRecordsByType('prescription'),
    completedRecords: getRecordsByStatus('completed'),
    pendingRecords: getRecordsByStatus('pending'),
    scheduledRecords: getRecordsByStatus('scheduled'),
    hasRecords: state.records.length > 0,
    hasError: !!state.error,
    isEmpty: state.records.length === 0 && !state.isLoading,

    // Patient context info
    currentPatientId: currentPatient?.id || null,
    currentPatientName: currentPatient?.full_name || '',
  };
};

export default useMedicalHistory;
