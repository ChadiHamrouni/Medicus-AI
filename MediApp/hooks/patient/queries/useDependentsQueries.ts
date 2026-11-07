/**
 * TanStack Query hooks for dependents data fetching
 */

import { useAuthContext } from '@/contexts/AuthContext';
import type { DependentListResponse, DependentResponse } from '@/types';
import { getAvailablePatientContexts, getDependents } from '@/services';
import { logger } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '../../shared/useErrorHandling';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../../shared/useQueryConfig';

export const DEPENDENTS_QUERY_KEYS = QUERY_KEYS.dependents;

/**
 * Hook to fetch all dependents
 */
export function useDependentsQuery(
  includeMain: boolean = true,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  const { enabled = true, refetchOnWindowFocus = false } = options || {};

  // Get authentication state to conditionally enable query
  const { authState } = useAuthContext();
  const isUserAuthenticated = authState.isAuthenticated;

  return useQuery({
    queryKey: QUERY_KEYS.dependents.list(includeMain),
    queryFn: async (): Promise<DependentListResponse> => {
      logger.info('Fetching dependents', {
        component: 'useDependentsQuery',
        includeMain,
      });

      const response = await getDependents(includeMain);

      logger.info('Dependents fetched successfully', {
        component: 'useDependentsQuery',
        count: response.dependents?.length || 0,
        total: response.total,
      });

      return response;
    },
    enabled: enabled && isUserAuthenticated,
    refetchOnWindowFocus,
    refetchOnMount: false, // Don't refetch on mount - use cached data
    ...SHARED_QUERY_CONFIG.DEPENDENTS,
    // Override retry to NOT retry on TypeError (network unreachable)
    retry: (failureCount, error) => {
      // Don't retry network failures (TypeError from fetch)
      if (
        error instanceof TypeError &&
        error.message.includes('Network request failed')
      ) {
        logger.warn('Network unreachable for dependents, not retrying', {
          component: 'useDependentsQuery',
          error: error.message,
        });
        return false;
      }
      // Use default retry logic for other errors
      return SHARED_QUERY_CONFIG.DEPENDENTS.retry(failureCount, error);
    },
    ...(options?.staleTime && { staleTime: options.staleTime }),
    meta: {
      errorMessage: 'Failed to load dependents',
    },
  });
}

/**
 * Hook to fetch a specific dependent
 */
export function useDependentQuery(
  patientId: number | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options || {};

  return useQuery({
    queryKey: DEPENDENTS_QUERY_KEYS.detail(patientId),
    queryFn: async (): Promise<DependentResponse> => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      logger.info('Fetching dependent detail', {
        component: 'useDependentQuery',
        patientId,
      });

      const { getDependentById } = await import('@/services');
      const response = await getDependentById(patientId);

      logger.info('Dependent detail fetched successfully', {
        component: 'useDependentQuery',
        patientId,
        dependentName: response.full_name,
      });

      return response;
    },
    enabled: enabled && !!patientId,
    staleTime,
    retry: (failureCount, error) => {
      return SHARED_QUERY_CONFIG.DEPENDENTS.retry(failureCount, error);
    },
    meta: {
      errorMessage: 'Failed to load dependent details',
    },
  });
}

/**
 * Hook to fetch available patient contexts
 */
export function useAvailablePatientContextsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  const { enabled = true } = options || {};

  // Get authentication state to conditionally enable query
  const { authState } = useAuthContext();
  const isUserAuthenticated = authState.isAuthenticated;

  return useQuery({
    queryKey: QUERY_KEYS.dependents.contexts(),
    queryFn: async (): Promise<DependentResponse[]> => {
      logger.info('Fetching available patient contexts', {
        component: 'useAvailablePatientContextsQuery',
      });

      const response = await getAvailablePatientContexts();

      logger.info('Patient contexts fetched successfully', {
        component: 'useAvailablePatientContextsQuery',
        count: response?.length || 0,
      });

      return response;
    },
    enabled: enabled && isUserAuthenticated,
    ...SHARED_QUERY_CONFIG.DEPENDENTS,
    ...(options?.staleTime && { staleTime: options.staleTime }),
    meta: {
      errorMessage: 'Failed to load patient contexts',
    },
  });
}

/**
 * Utility hook to get dependents data with loading states
 */
export function useDependentsData(includeMain: boolean = true) {
  const query = useDependentsQuery(includeMain);

  return {
    dependents: query.data?.dependents || [],
    mainPatient: query.data?.main_patient,
    summary: query.data?.summary,
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    errorMessage: query.error ? getErrorMessage(query.error as Error) : null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
