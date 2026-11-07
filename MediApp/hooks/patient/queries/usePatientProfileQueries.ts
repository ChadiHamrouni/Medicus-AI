/**
 * TanStack Query hooks for patient profile data fetching
 */

import { getCurrentPatientProfile, getPatientById } from '@/services';
import type { PatientProfileResponse } from '@/types';
import { logger } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../../shared/useQueryConfig';

export const PATIENT_PROFILE_QUERY_KEYS = QUERY_KEYS.patientProfile;

/**
 * Hook to fetch current patient profile data
 */
export function usePatientProfileQuery(
  enabled: boolean = true,
  userData?: any
) {
  return useQuery({
    queryKey: QUERY_KEYS.patientProfile.profile(),
    queryFn: async (): Promise<PatientProfileResponse> => {
      logger.info('Fetching patient profile data', {
        component: 'usePatientProfileQuery',
      });

      const profile = await getCurrentPatientProfile(userData);

      logger.info('Patient profile data fetched successfully', {
        component: 'usePatientProfileQuery',
        profileId: profile.id,
        patientName: profile.full_name,
      });

      return profile;
    },
    enabled,
    ...SHARED_QUERY_CONFIG.PATIENT_PROFILE,
    meta: {
      errorMessage: 'Failed to load patient profile',
    },
  });
}

/**
 * Hook to fetch patient data by ID
 */
export function usePatientByIdQuery(
  patientId: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: QUERY_KEYS.patientProfile.patientById(patientId),
    queryFn: async (): Promise<PatientProfileResponse> => {
      logger.info('Fetching patient data by ID', {
        component: 'usePatientByIdQuery',
        patientId,
      });

      const patient = await getPatientById(patientId);

      logger.info('Patient data fetched successfully', {
        component: 'usePatientByIdQuery',
        patientId: patient.id,
        patientName: patient.full_name,
      });

      return patient;
    },
    enabled: enabled && patientId > 0,
    ...SHARED_QUERY_CONFIG.PATIENT_PROFILE,
    meta: {
      errorMessage: 'Failed to load patient data',
    },
  });
}
