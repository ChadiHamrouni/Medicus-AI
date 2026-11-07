/**
 * Patient Context with Zustand Backend
 * Connects React Query mutations with Zustand state management
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import { usePatientStore, type PatientData } from '@/contexts/PatientStore';
// import { useDependentsData } from '@/hooks/patient/queries'; // DISABLED: No API call
import {
  useCreateDependentMutation,
  useUpdateDependentMutation,
  useDeleteDependentMutation,
  useSwitchPatientContextMutation,
} from '@/hooks/patient/mutations';
import type { CreateDependentRequest, UpdateDependentRequest } from '@/types';
import { logger } from '@/utils';
import { useDependents } from '@/contexts/DependentsContext';
import { useAuthContext } from '@/contexts/AuthContext';

interface PatientContextType {
  // State
  currentPatient: PatientData | null;
  availablePatients: PatientData[];
  mainPatient: PatientData | null | undefined;
  dependents: PatientData[];
  isLoading: boolean;
  error: string | null;
  isDependentContext: boolean;

  // Actions
  switchPatient: (_patient: PatientData) => Promise<boolean>;
  addDependent: (
    _dependentData: CreateDependentRequest
  ) => Promise<PatientData>;
  updateDependent: (
    _patientId: number,
    _updateData: UpdateDependentRequest
  ) => Promise<PatientData>;
  deleteDependent: (_patientId: number) => Promise<boolean>;
  clearError: () => void;
  refresh: () => Promise<void>;

  // Computed values
  hasMultiplePatients: boolean;
  currentPatientName: string;
  currentRelationship: string;

  // Additional states for individual operations
  isCreatingDependent: boolean;
  isUpdatingDependent: boolean;
  isDeletingDependent: boolean;
  isSwitchingContext: boolean;
}

interface PatientProviderProps {
  children: ReactNode;
}

/**
 * Hook that combines Zustand store with React Query mutations
 * This provides the complete patient context functionality
 */
function usePatientContextLogic(): PatientContextType {
  const store = usePatientStore();

  // DISABLED: Use DependentsContext data instead (no API call)
  // React Query hooks for data and mutations
  // const {
  //   dependents,
  //   mainPatient,
  //   isLoading: isDependentsLoading,
  //   errorMessage: dependentsErrorMessage,
  //   refetch: refetchDependents,
  //   isRefetching: isRefetchingDependents,
  // } = useDependentsData(true);

  // Use DependentsContext data (from API via React Query)
  const {
    dependents: depsContextDependents,
    isLoading: isDependentsLoading,
    refreshDependents,
  } = useDependents();
  const { authState } = useAuthContext();

  // Transform DependentsContext data to match PatientData format - USE REAL API DATA
  const dependents = useMemo(() => {
    return depsContextDependents.map(dep => ({
      id: dep.id,
      full_name: dep.full_name || dep.name,
      relationship: dep.relationship.toLowerCase(),
      age: dep.age,
      // Use real data from API - no more hardcoded nulls/empty strings
      first_name: dep.first_name || dep.name.split(' ')[0] || '',
      last_name: dep.last_name || dep.name.split(' ').slice(1).join(' ') || '',
      dob: dep.dob || '',
      gender: dep.gender || '',
      email: dep.email || null,
      phone_number: dep.phone_number || null,
      country_code: null, // TODO: Extract from phone_number if needed
      is_active: true,
      created_at: dep.created_at || new Date().toISOString(),
      updated_at: dep.updated_at || null,
    }));
  }, [depsContextDependents]);

  const mainPatient = useMemo(() => {
    const profile = authState.patientProfile;
    if (!profile) return null;

    return {
      id: profile.id,
      full_name:
        profile.full_name ||
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      relationship: 'self',
      age: 0, // Calculate from dob if needed
      dob: profile.dob || profile.date_of_birth || '',
      gender: profile.gender || '',
      email: profile.email || null,
      phone_number: profile.phone_number || null,
      country_code: profile.country_code || null,
      is_active: true,
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || null,
      emergency_contact: profile.emergency_contact || [],
      medical_conditions: profile.medical_conditions || [],
      allergies: profile.allergies || [],
      medications: profile.medications || [],
      medical_data: profile.medical_data,
      insurance_provider: profile.insurance_provider,
      insurance_member_id: profile.insurance_member_id,
      insurance_group_number: profile.insurance_group_number,
    };
  }, [authState.patientProfile]);

  // Mutation hooks
  const createDependentMutation = useCreateDependentMutation();
  const updateDependentMutation = useUpdateDependentMutation();
  const deleteDependentMutation = useDeleteDependentMutation();
  const switchContextMutation = useSwitchPatientContextMutation();

  // Sync React Query data with Zustand store
  useEffect(() => {
    if (dependents && mainPatient !== undefined) {
      store.setDependentsData({
        dependents,
        main_patient: mainPatient,
        total: dependents.length + (mainPatient ? 1 : 0),
        summary: {
          total_dependents: dependents.length,
          relationship_breakdown: dependents.reduce(
            (acc, dep) => {
              acc[dep.relationship] = (acc[dep.relationship] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          age_groups: {
            minor: dependents.filter(d => d.age < 18).length,
            adult: dependents.filter(d => d.age >= 18).length,
          },
          has_minors: dependents.some(d => d.age < 18),
          has_adults: dependents.some(d => d.age >= 18),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependents, mainPatient]); // Note: 'store' intentionally omitted to prevent infinite loops

  // Enhanced mutation functions with Zustand integration
  const addDependent = async (
    dependentData: CreateDependentRequest
  ): Promise<PatientData> => {
    try {
      store.setIsCreatingDependent(true);
      store.clearError();

      logger.info('Creating new dependent', {
        component: 'PatientContext',
        dependentName: `${dependentData.first_name} ${dependentData.last_name}`,
        relationship: dependentData.relationship,
      });

      const newDependent =
        await createDependentMutation.mutateAsync(dependentData);

      // Add to store optimistically
      store.addLocalDependent(newDependent);

      // Schedule background sync to get fresh data
      store.scheduleBackgroundSync(5000);

      logger.info('Dependent created successfully', {
        component: 'PatientContext',
        dependentId: newDependent.id,
        dependentName: newDependent.full_name,
      });

      return newDependent;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to add dependent';
      store.setError(errorMessage);

      logger.error('Failed to add dependent', error, {
        component: 'PatientContext',
      });

      throw error;
    } finally {
      store.setIsCreatingDependent(false);
    }
  };

  const updateDependent = async (
    patientId: number,
    updateData: UpdateDependentRequest
  ): Promise<PatientData> => {
    try {
      store.setIsUpdatingDependent(true);
      store.clearError();

      logger.info('Updating dependent', {
        component: 'PatientContext',
        patientId,
      });

      const updatedDependent = await updateDependentMutation.mutateAsync({
        patientId,
        data: updateData,
      });

      // Update store optimistically
      store.updateLocalPatient(updatedDependent);

      // Schedule background sync
      store.scheduleBackgroundSync(5000);

      logger.info('Dependent updated successfully', {
        component: 'PatientContext',
        dependentId: updatedDependent.id,
        dependentName: updatedDependent.full_name,
      });

      return updatedDependent;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update dependent';
      store.setError(errorMessage);

      logger.error('Failed to update dependent', error, {
        component: 'PatientContext',
        patientId,
      });

      throw error;
    } finally {
      store.setIsUpdatingDependent(false);
    }
  };

  const deleteDependent = async (patientId: number): Promise<boolean> => {
    try {
      store.setIsDeletingDependent(true);
      store.clearError();

      logger.info('Deleting dependent', {
        component: 'PatientContext',
        patientId,
      });

      await deleteDependentMutation.mutateAsync(patientId);

      // Remove from store optimistically
      store.removeLocalDependent(patientId);

      // If we're currently viewing the deleted patient, switch to main
      if (store.currentPatient?.id === patientId && store.mainPatient) {
        await store.switchPatient(store.mainPatient);
      }

      // Schedule background sync
      store.scheduleBackgroundSync(5000);

      logger.info('Dependent deleted successfully', {
        component: 'PatientContext',
        patientId,
      });

      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete dependent';
      store.setError(errorMessage);

      logger.error('Failed to delete dependent', error, {
        component: 'PatientContext',
        patientId,
      });

      throw error;
    } finally {
      store.setIsDeletingDependent(false);
    }
  };

  // Combined loading state
  const isLoading = useMemo(() => {
    return (
      isDependentsLoading ||
      store.isLoading ||
      createDependentMutation.isPending ||
      updateDependentMutation.isPending ||
      deleteDependentMutation.isPending ||
      switchContextMutation.isPending
    );
  }, [
    isDependentsLoading,
    store.isLoading,
    createDependentMutation.isPending,
    updateDependentMutation.isPending,
    deleteDependentMutation.isPending,
    switchContextMutation.isPending,
  ]);

  // Combined error state
  const error = useMemo(() => {
    return (
      store.error ||
      createDependentMutation.error?.message ||
      updateDependentMutation.error?.message ||
      deleteDependentMutation.error?.message ||
      switchContextMutation.error?.message ||
      null
    );
  }, [
    store.error,
    createDependentMutation.error?.message,
    updateDependentMutation.error?.message,
    deleteDependentMutation.error?.message,
    switchContextMutation.error?.message,
  ]);

  return {
    // State from Zustand store
    currentPatient: store.currentPatient,
    availablePatients: store.availablePatients,
    mainPatient: store.mainPatient,
    dependents: store.dependents,
    isLoading,
    error,
    isDependentContext: store.isDependentContext,

    // Actions (enhanced with React Query)
    switchPatient: store.switchPatient,
    addDependent,
    updateDependent,
    deleteDependent,
    clearError: store.clearError,
    refresh: async () => {
      await refreshDependents();
      store.saveCurrentState();
    },

    // Computed values
    hasMultiplePatients: store.availablePatients.length > 1,
    currentPatientName: store.currentPatient?.full_name || '',
    currentRelationship: store.currentPatient?.relationship || '',

    // Individual loading states
    isCreatingDependent:
      store.isCreatingDependent || createDependentMutation.isPending,
    isUpdatingDependent:
      store.isUpdatingDependent || updateDependentMutation.isPending,
    isDeletingDependent:
      store.isDeletingDependent || deleteDependentMutation.isPending,
    isSwitchingContext:
      store.isSwitchingContext || switchContextMutation.isPending,
  };
}

// Simple provider that just renders children (Zustand doesn't need providers)
export const PatientProvider: React.FC<PatientProviderProps> = ({
  children,
}) => {
  return <>{children}</>;
};

// Export the hook for use throughout the app
export const usePatientContextProvider = usePatientContextLogic;

// Also export with the original name for backward compatibility
export const usePatientContext = usePatientContextLogic;

export const usePatient = usePatientContextLogic;

export default usePatientContextLogic;
