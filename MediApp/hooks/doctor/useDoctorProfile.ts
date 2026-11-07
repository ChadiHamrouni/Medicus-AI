/**
 * Combined hook for doctor profile operations
 * Provides a single interface for all doctor profile-related functionality
 */

import { useDoctorProfileContext } from '@/contexts/DoctorProfileContext';
import type {
  ContactInfo,
  DoctorLocation,
  DoctorUpdateRequest,
  MedicalProceduresRequest,
  PracticeInfoData,
  ProfessionalInfoRequest,
  WorkingHoursRequest,
} from '@/types';
import { logger } from '@/utils';
import {
  useUpdateDoctorAdditionalInfoMutation,
  useUpdateDoctorContactInfoMutation,
  useUpdateDoctorLocationsMutation,
  useUpdateDoctorPracticeInfoMutation,
  useUpdateDoctorProceduresMutation,
  useUpdateDoctorProfessionalInfoMutation,
  useUpdateDoctorWorkingHoursMutation,
} from './mutations/useDoctorProfileMutations';

export function useDoctorProfile() {
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
  } = useDoctorProfileContext();

  // Mutations for updating profile data
  const additionalInfoMutation = useUpdateDoctorAdditionalInfoMutation();
  const professionalInfoMutation = useUpdateDoctorProfessionalInfoMutation();
  const contactInfoMutation = useUpdateDoctorContactInfoMutation();
  const practiceInfoMutation = useUpdateDoctorPracticeInfoMutation();
  const locationsMutation = useUpdateDoctorLocationsMutation();
  const workingHoursMutation = useUpdateDoctorWorkingHoursMutation();
  const proceduresMutation = useUpdateDoctorProceduresMutation();

  // Combined loading state
  const isUpdating =
    additionalInfoMutation.isPending ||
    professionalInfoMutation.isPending ||
    contactInfoMutation.isPending ||
    practiceInfoMutation.isPending ||
    locationsMutation.isPending ||
    workingHoursMutation.isPending ||
    proceduresMutation.isPending;

  // Combined loading state (context loading or any mutation loading)
  const isLoading = isContextLoading || isUpdating;

  // Update functions with optimistic updates (no immediate server refresh due to API lag)
  const updateAdditionalInfo = async (data: DoctorUpdateRequest) => {
    if (profile) {
      updateLocalProfile(data);
    }

    try {
      const result = await additionalInfoMutation.mutateAsync(data);

      saveCurrentState();

      logger.info('Doctor additional info updated (using optimistic update)', {
        component: 'useDoctorProfile',
        note: 'Server refresh skipped due to API lag',
      });

      return result;
    } catch (error) {
      // On error, revert optimistic update by refreshing from server (force update)
      await refreshProfile(true);
      throw error;
    }
  };

  const updateProfessionalInfo = async (data: ProfessionalInfoRequest) => {
    if (profile) {
      const updateData = {
        ...data,
        languages_spoken:
          data.languages_spoken?.map(String) || profile.languages_spoken,
      };
      updateLocalProfile(updateData);
    }

    try {
      const result = await professionalInfoMutation.mutateAsync(data);

      saveCurrentState();

      logger.info(
        'Doctor professional info updated (using optimistic update)',
        {
          component: 'useDoctorProfile',
          updatedData: data,
          note: 'Server refresh skipped due to API lag',
        }
      );

      return result;
    } catch (error) {
      // On error, revert optimistic update
      await refreshProfile(true);
      throw error;
    }
  };

  const updateContactInfo = async (data: ContactInfo) => {
    if (profile) {
      updateLocalProfile({
        ...profile,
        practice_email: data.professional_email,
        practice_phone: data.professional_phone,
        contact_cell_phone: data.office_phone,
        fax_number: data.fax_number,
        practice_website: data.website_url,
      });
    }

    try {
      const result = await contactInfoMutation.mutateAsync(data);

      saveCurrentState();

      logger.info('Doctor contact info updated (using optimistic update)', {
        component: 'useDoctorProfile',
        updatedFields: Object.keys(data).filter(
          key => data[key as keyof ContactInfo]
        ),
        note: 'Server refresh skipped due to API lag',
      });

      return result;
    } catch (error) {
      await refreshProfile(true);
      throw error;
    }
  };

  const updateLocations = async (locations: DoctorLocation[]) => {
    if (profile) {
      updateLocalProfile({
        other_locations: locations,
      });
    }

    try {
      const result = await locationsMutation.mutateAsync(locations);

      saveCurrentState();

      logger.info('Doctor locations updated (using optimistic update)', {
        component: 'useDoctorProfile',
        locationsCount: locations.length,
        note: 'Server refresh skipped due to API lag',
      });

      return result;
    } catch (error) {
      // On error, revert optimistic update
      await refreshProfile(true);
      throw error;
    }
  };

  const updateWorkingHours = async (data: WorkingHoursRequest) => {
    if (profile) {
      updateLocalProfile({ working_hours: data.working_hours });
    }

    try {
      const result = await workingHoursMutation.mutateAsync(data);

      saveCurrentState();

      logger.info('Doctor working hours updated (using optimistic update)', {
        component: 'useDoctorProfile',
        note: 'Server refresh skipped due to API lag',
      });

      return result;
    } catch (error) {
      // On error, revert optimistic update
      await refreshProfile(true);
      throw error;
    }
  };

  const updateProcedures = async (data: MedicalProceduresRequest) => {
    if (profile) {
      updateLocalProfile({ medical_procedures: data });
    }

    try {
      const result = await proceduresMutation.mutateAsync(data);

      saveCurrentState();

      logger.info('Doctor procedures updated (using optimistic update)', {
        component: 'useDoctorProfile',
        proceduresCount: data.medical_procedures.length,
        note: 'Server refresh skipped due to API lag',
      });

      return result;
    } catch (error) {
      // On error, revert optimistic update
      await refreshProfile(true);
      throw error;
    }
  };

  const updatePracticeInfo = async (data: PracticeInfoData) => {
    if (profile) {
      updateLocalProfile(data);
    }

    try {
      const result = await practiceInfoMutation.mutateAsync(data);

      saveCurrentState();

      logger.info('Doctor practice info updated (using optimistic update)', {
        component: 'useDoctorProfile',
        note: 'Server refresh skipped due to API lag',
      });

      return result;
    } catch (error) {
      // On error, revert optimistic update
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

    // Update operations
    updateAdditionalInfo,
    updateProfessionalInfo,
    updateContactInfo,
    updatePracticeInfo,
    updateLocations,
    updateWorkingHours,
    updateProcedures,

    // Update states
    isUpdating,
    additionalInfoError: additionalInfoMutation.error,
    professionalInfoError: professionalInfoMutation.error,
    contactInfoError: contactInfoMutation.error,
    practiceInfoError: practiceInfoMutation.error,
    locationsError: locationsMutation.error,
    workingHoursError: workingHoursMutation.error,
    proceduresError: proceduresMutation.error,

    // Individual loading states for granular UI control
    isUpdatingAdditionalInfo: additionalInfoMutation.isPending,
    isUpdatingProfessionalInfo: professionalInfoMutation.isPending,
    isUpdatingContactInfo: contactInfoMutation.isPending,
    isUpdatingPracticeInfo: practiceInfoMutation.isPending,
    isUpdatingLocations: locationsMutation.isPending,
    isUpdatingWorkingHours: workingHoursMutation.isPending,
    isUpdatingProcedures: proceduresMutation.isPending,
  };
}
