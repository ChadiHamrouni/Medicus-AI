/**
 * Provides a single interface for all patient profile-related functionality
 */

import { usePatientProfileContext } from '@/contexts/PatientProfileContext';
import type { PatientProfileUpdateRequest } from './mutations/usePatientProfileMutations';
import { useUpdatePatientProfileMutation } from './mutations/usePatientProfileMutations';
import { logger } from '@/utils';

export function usePatientProfile() {
  // Use the context for profile state management
  const {
    profile,
    isLoading: isContextLoading,
    error: contextError,
    refreshProfile,
    updateLocalProfile,
    clearError,
    hasInitialized,
    lastSyncTime,
    lastUpdateTime,
    scheduleBackgroundSync,
    saveCurrentState,
    displayName,
    fullName,
    isProfileComplete,
  } = usePatientProfileContext();

  // Mutations for updating profile data
  const profileMutation = useUpdatePatientProfileMutation();

  // Combined loading state
  const isUpdating = profileMutation.isPending;

  // Combined loading state (context loading or any mutation loading)
  const isLoading = isContextLoading || isUpdating;

  // Optimized update function - updates locally first, syncs to server in background
  const updateProfile = async (
    data: PatientProfileUpdateRequest,
    patient_id?: number
  ) => {
    if (!profile) {
      throw new Error('No profile loaded');
    }

    // Optimistic update - apply changes locally immediately
    updateLocalProfile(data);

    try {
      // Use the profile's ID if patient_id not provided
      const targetPatientId = patient_id || profile.id;

      // Background sync to server (non-blocking)
      const result = await profileMutation.mutateAsync({
        profileData: data,
        patient_id: targetPatientId,
      });

      // Save the successful state as baseline
      saveCurrentState();

      logger.info('Patient profile updated with optimistic updates', {
        component: 'usePatientProfile',
        updatedFields: Object.keys(data),
        patientId: targetPatientId,
        strategy: 'optimistic_local_first',
      });

      return result;
    } catch (error) {
      // On error, revert optimistic update by refreshing from server
      logger.warn('Profile update failed, reverting optimistic changes', {
        component: 'usePatientProfile',
        error: (error as Error).message,
        updatedFields: Object.keys(data),
      });

      await refreshProfile(true);
      throw error;
    }
  };

  return {
    // Profile data - using context state management
    profile,
    isLoading,
    error: contextError,
    refetch: refreshProfile,

    // Context-specific methods
    updateLocalProfile,
    clearError,
    hasInitialized,
    lastSyncTime,
    lastUpdateTime,
    scheduleBackgroundSync,
    saveCurrentState,

    // Computed properties
    displayName,
    fullName,
    isProfileComplete,

    // Update operations
    updateProfile,
    // Legacy alias for backward compatibility
    updateContactInfo: updateProfile,

    // Update states
    isUpdating,
    profileError: profileMutation.error,
    // Legacy aliases
    contactInfoError: profileMutation.error,

    // Individual loading states for granular UI control
    isUpdatingProfile: profileMutation.isPending,
    // Legacy alias
    isUpdatingContactInfo: profileMutation.isPending,
  };
}
