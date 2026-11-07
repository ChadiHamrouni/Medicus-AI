/**
 * TanStack Query mutation hooks for patient profile updates
 */

import { updatePatientProfile } from '@/services';
import type { PatientProfileResponse } from '@/types';
import { logger } from '@/utils';
import { useMutation } from '@tanstack/react-query';

// Type definitions for patient profile updates
export interface PatientProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  gender?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country_id?: number;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  emergency_contact?: {
    primary?: {
      name: string;
      phone: string;
      relationship: string;
      email?: string;
    };
    secondary?: {
      name: string;
      phone: string;
      relationship?: string;
      email?: string;
    };
  };
}

export interface PatientProfileUpdateData {
  profileData: PatientProfileUpdateRequest;
  patient_id: number;
}

// Legacy types for backward compatibility
export type PatientContactUpdateRequest = PatientProfileUpdateRequest;
export interface PatientContactUpdateData {
  contactData: PatientProfileUpdateRequest;
  patient_id: number;
}

/**
 * Hook to update patient profile information
 */
export function useUpdatePatientProfileMutation() {
  return useMutation({
    mutationFn: async ({
      profileData,
      patient_id,
    }: PatientProfileUpdateData): Promise<PatientProfileResponse> => {
      logger.info('Updating patient profile', {
        component: 'useUpdatePatientProfileMutation',
        data: JSON.stringify(profileData),
        patient_id,
        fieldsToUpdate: Object.keys(profileData),
      });

      const updatedProfile = await updatePatientProfile(
        profileData as any,
        patient_id
      );

      logger.info('Patient profile updated successfully', {
        component: 'useUpdatePatientProfileMutation',
        profileId: updatedProfile.id,
        updatedFields: Object.keys(profileData),
      });

      return updatedProfile;
    },
    onSuccess: () => {
      // Skip query invalidation - we use optimistic updates, no need to refetch
      logger.info(
        'Patient profile mutation succeeded - using optimistic updates, no refetch needed',
        {
          component: 'useUpdatePatientProfileMutation',
          strategy: 'optimistic_local_only',
        }
      );
    },
    onError: error => {
      logger.error('Failed to update patient profile', error as Error, {
        component: 'useUpdatePatientProfileMutation',
      });
    },
    meta: {
      errorMessage: 'Failed to update patient profile',
    },
  });
}
