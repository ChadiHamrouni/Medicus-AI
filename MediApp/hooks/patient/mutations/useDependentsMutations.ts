/**
 * TanStack Query mutation hooks for dependents management
 */

import type {
  CreateDependentRequest,
  DependentResponse,
  SwitchContextResponse,
  UpdateDependentRequest,
} from '@/types';
import {
  createDependent,
  deleteDependent,
  switchPatientContext,
  updateDependent,
} from '@/services';
import { logger } from '@/utils';
import { updateGlobalAuthState } from '@/hooks/auth/internal/authState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DEPENDENTS_QUERY_KEYS } from '../queries/useDependentsQueries';

/**
 * Hook to create a new dependent
 */
export function useCreateDependentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateDependentRequest
    ): Promise<DependentResponse> => {
      logger.info('Creating dependent', {
        component: 'useCreateDependentMutation',
        dependentName: `${data.first_name} ${data.last_name}`,
        relationship: data.relationship,
      });

      const response = await createDependent(data);

      logger.info('Dependent created successfully', {
        component: 'useCreateDependentMutation',
        dependentId: response.id,
        dependentName: response.full_name,
      });

      return response;
    },
    onSuccess: newDependent => {
      // Invalidate and refetch dependents lists
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.contexts(),
      });

      logger.info('Dependent creation mutation completed successfully', {
        component: 'useCreateDependentMutation',
        dependentId: newDependent.id,
      });
    },
    onError: error => {
      logger.error('Dependent creation failed', error as Error, {
        component: 'useCreateDependentMutation',
      });
    },
    retry: false,
  });
}

/**
 * Hook to update a dependent
 */
export function useUpdateDependentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      data,
    }: {
      patientId: number;
      data: UpdateDependentRequest;
    }): Promise<DependentResponse> => {
      logger.info('Updating dependent', {
        component: 'useUpdateDependentMutation',
        patientId,
      });

      const response = await updateDependent(patientId, data);

      logger.info('Dependent updated successfully', {
        component: 'useUpdateDependentMutation',
        patientId,
        dependentName: response.full_name,
      });

      return response;
    },
    onSuccess: updatedDependent => {
      // Invalidate and refetch dependents lists and detail
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.detail(updatedDependent.id),
      });
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.contexts(),
      });

      logger.info('Dependent update mutation completed successfully', {
        component: 'useUpdateDependentMutation',
        dependentId: updatedDependent.id,
      });
    },
    onError: error => {
      logger.error('Dependent update failed', error as Error, {
        component: 'useUpdateDependentMutation',
      });
    },
    retry: false,
  });
}

/**
 * Hook to delete a dependent
 */
export function useDeleteDependentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      patientId: number
    ): Promise<{ success: boolean; message: string }> => {
      logger.info('Deleting dependent', {
        component: 'useDeleteDependentMutation',
        patientId,
      });

      const response = await deleteDependent(patientId);

      logger.info('Dependent deleted successfully', {
        component: 'useDeleteDependentMutation',
        patientId,
        message: response.message,
      });

      return response;
    },
    onSuccess: (_, patientId) => {
      // Invalidate and refetch dependents lists
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.contexts(),
      });

      // Remove the specific dependent from cache
      queryClient.removeQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.detail(patientId),
      });

      logger.info('Dependent deletion mutation completed successfully', {
        component: 'useDeleteDependentMutation',
        patientId,
      });
    },
    onError: error => {
      logger.error('Dependent deletion failed', error as Error, {
        component: 'useDeleteDependentMutation',
      });
    },
    retry: false,
  });
}

/**
 * Hook to switch patient context
 */
export function useSwitchPatientContextMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: number): Promise<SwitchContextResponse> => {
      logger.info('Switching patient context', {
        component: 'useSwitchPatientContextMutation',
        patientId,
      });

      const response = await switchPatientContext(patientId);

      logger.info('Patient context switched successfully', {
        component: 'useSwitchPatientContextMutation',
        activePatientId: response.active_patient_id,
        activePatientName: response.active_patient.full_name,
        isDependent: response.is_dependent_context,
      });

      return response;
    },
    onSuccess: contextResponse => {
      // Update the global auth state with the new active patient
      // This ensures sender_id is correctly set for conversations
      updateGlobalAuthState({
        patientProfile: contextResponse.active_patient,
      });

      // Invalidate patient context related queries
      queryClient.invalidateQueries({
        queryKey: DEPENDENTS_QUERY_KEYS.contexts(),
      });

      // You might want to invalidate other queries that depend on patient context
      // For example, conversations queries might need to be refreshed
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      logger.info('Patient context switch mutation completed successfully', {
        component: 'useSwitchPatientContextMutation',
        activePatientId: contextResponse.active_patient_id,
        updatedAuthState: true,
      });
    },
    onError: error => {
      logger.error('Patient context switch failed', error as Error, {
        component: 'useSwitchPatientContextMutation',
      });
    },
    retry: false,
  });
}

/**
 * Combined hook for dependent management operations
 */
export function useDependentMutations() {
  const createMutation = useCreateDependentMutation();
  const updateMutation = useUpdateDependentMutation();
  const deleteMutation = useDeleteDependentMutation();
  const switchContextMutation = useSwitchPatientContextMutation();

  return {
    // Create operations
    createDependent: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    // Update operations
    updateDependent: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    // Delete operations
    deleteDependent: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    // Context switch operations
    switchPatientContext: switchContextMutation.mutateAsync,
    isSwitchingContext: switchContextMutation.isPending,
    switchContextError: switchContextMutation.error,

    // Combined loading state
    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      switchContextMutation.isPending,

    // Reset functions
    resetCreateError: createMutation.reset,
    resetUpdateError: updateMutation.reset,
    resetDeleteError: deleteMutation.reset,
    resetSwitchContextError: switchContextMutation.reset,
  };
}
