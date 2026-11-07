/**
 * TanStack Query mutation hooks for doctor profile updates
 */

import {
  updateDoctorAdditionalInfo,
  updateDoctorAdditionalLinks,
  updateDoctorContactInfo,
  updateDoctorLocations,
  updateDoctorPracticeInformation,
  updateDoctorProcedures,
  updateDoctorProfessionalInfo,
  updateDoctorWorkingHours,
} from '@/services';
import type {
  AdditionalLinksRequest,
  ContactInfo,
  DoctorLocation,
  DoctorUpdateRequest,
  MedicalProceduresRequest,
  PracticeInfoData,
  ProfessionalInfoRequest,
  WorkingHoursRequest,
} from '@/types';
import { logger } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorQueryKeys } from '../queryKeys';

/**
 * Hook to update doctor professional information
 */
export function useUpdateDoctorProfessionalInfoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfessionalInfoRequest) => {
      logger.info('Updating doctor professional info', {
        component: 'useUpdateDoctorProfessionalInfoMutation',
        data: JSON.stringify(data),
      });

      await updateDoctorProfessionalInfo(data);

      logger.info('Doctor professional info updated successfully', {
        component: 'useUpdateDoctorProfessionalInfoMutation',
      });
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor professional info cache invalidated', {
        component: 'useUpdateDoctorProfessionalInfoMutation',
      });
    },
    onError: error => {
      logger.error(
        'Failed to update doctor professional info',
        error as Error,
        {
          component: 'useUpdateDoctorProfessionalInfoMutation',
        }
      );
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update professional information',
    },
  });
}

/**
 * Hook to update doctor additional information
 */
export function useUpdateDoctorAdditionalInfoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DoctorUpdateRequest) => {
      logger.info('Updating doctor additional info', {
        component: 'useUpdateDoctorAdditionalInfoMutation',
      });

      await updateDoctorAdditionalInfo(data);

      logger.info('Doctor additional info updated successfully', {
        component: 'useUpdateDoctorAdditionalInfoMutation',
      });
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor additional info cache invalidated', {
        component: 'useUpdateDoctorAdditionalInfoMutation',
      });
    },
    onError: error => {
      logger.error('Failed to update doctor additional info', error as Error, {
        component: 'useUpdateDoctorAdditionalInfoMutation',
      });
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update additional information',
    },
  });
}

/**
 * Hook to update doctor contact information
 */
export function useUpdateDoctorContactInfoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContactInfo) => {
      logger.info('Updating doctor contact info', {
        component: 'useUpdateDoctorContactInfoMutation',
      });

      await updateDoctorContactInfo(data);

      logger.info('Doctor contact info updated successfully', {
        component: 'useUpdateDoctorContactInfoMutation',
      });

      return data;
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor contact info cache invalidated', {
        component: 'useUpdateDoctorContactInfoMutation',
      });
    },
    onError: error => {
      logger.error('Failed to update doctor contact info', error as Error, {
        component: 'useUpdateDoctorContactInfoMutation',
      });
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update contact information',
    },
  });
}

/**
 * Hook to update doctor locations
 */
export function useUpdateDoctorLocationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locations: DoctorLocation[]) => {
      logger.info('Updating doctor locations', {
        component: 'useUpdateDoctorLocationsMutation',
        locationsCount: locations.length,
        location: locations,
      });

      await updateDoctorLocations(locations);

      logger.info('Doctor locations updated successfully', {
        component: 'useUpdateDoctorLocationsMutation',
      });
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor locations cache invalidated', {
        component: 'useUpdateDoctorLocationsMutation',
      });
    },
    onError: error => {
      logger.error('Failed to update doctor locations', error as Error, {
        component: 'useUpdateDoctorLocationsMutation',
      });
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update locations',
    },
  });
}

/**
 * Hook to update doctor working hours
 */
export function useUpdateDoctorWorkingHoursMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WorkingHoursRequest) => {
      logger.info('Updating doctor working hours', {
        component: 'useUpdateDoctorWorkingHoursMutation',
      });

      await updateDoctorWorkingHours(data);

      logger.info('Doctor working hours updated successfully', {
        component: 'useUpdateDoctorWorkingHoursMutation',
      });
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor working hours cache invalidated', {
        component: 'useUpdateDoctorWorkingHoursMutation',
      });
    },
    onError: error => {
      logger.error('Failed to update doctor working hours', error as Error, {
        component: 'useUpdateDoctorWorkingHoursMutation',
      });
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update working hours',
    },
  });
}

/**
 * Hook to update doctor medical procedures
 */
export function useUpdateDoctorProceduresMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MedicalProceduresRequest) => {
      logger.info('Updating doctor procedures', {
        component: 'useUpdateDoctorProceduresMutation',
        proceduresCount: data.medical_procedures.length,
      });

      await updateDoctorProcedures(data);

      logger.info('Doctor procedures updated successfully', {
        component: 'useUpdateDoctorProceduresMutation',
      });
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor procedures cache invalidated', {
        component: 'useUpdateDoctorProceduresMutation',
      });
    },
    onError: error => {
      logger.error('Failed to update doctor procedures', error as Error, {
        component: 'useUpdateDoctorProceduresMutation',
      });
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update procedures',
    },
  });
}

/**
 * Hook to update doctor practice information
 */
export function useUpdateDoctorPracticeInfoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PracticeInfoData) => {
      logger.info('Updating doctor practice information', {
        component: 'useUpdateDoctorPracticeInfoMutation',
        data: JSON.stringify(data),
      });

      await updateDoctorPracticeInformation(data);

      logger.info('Doctor practice information updated successfully', {
        component: 'useUpdateDoctorPracticeInfoMutation',
      });
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor practice info cache invalidated', {
        component: 'useUpdateDoctorPracticeInfoMutation',
      });
    },
    onError: error => {
      logger.error('Failed to update practice information', error as Error, {
        component: 'useUpdateDoctorPracticeInfoMutation',
      });
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update practice information',
    },
  });
}

/**
 * Hook to update doctor additional links
 */
export function useUpdateDoctorAdditionalLinksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AdditionalLinksRequest) => {
      logger.info('Updating doctor additional links', {
        component: 'useUpdateDoctorAdditionalLinksMutation',
        linksCount: data.additional_links.length,
      });

      await updateDoctorAdditionalLinks(data);

      logger.info('Doctor additional links updated successfully', {
        component: 'useUpdateDoctorAdditionalLinksMutation',
      });
    },
    onSuccess: () => {
      // Invalidate all doctor profile related queries
      queryClient.invalidateQueries({
        queryKey: doctorQueryKeys.all,
      });

      logger.info('Doctor additional links cache invalidated', {
        component: 'useUpdateDoctorAdditionalLinksMutation',
      });
    },
    onError: error => {
      logger.error('Failed to update additional links', error as Error, {
        component: 'useUpdateDoctorAdditionalLinksMutation',
      });
    },
    retry: false,
    meta: {
      errorMessage: 'Failed to update additional links',
    },
  });
}
