import { useQuery } from '@tanstack/react-query';
import {
  getPatientConditions,
  MedicalConditionsResponse,
} from '@/services/patient/conditions';
import { logger } from '@/utils';
import { performanceMonitor } from '@/utils/performance';
import { medicalQueryKeys } from './queryKeys';

/**
 * Hook to fetch and manage patient medical conditions using React Query
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Request deduplication
 * - Background refetch on reconnect
 * - Automatic retry with exponential backoff
 * - Performance instrumentation
 */
export const useConditions = (patientId: number | null) => {
  const {
    data: conditions,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: medicalQueryKeys.conditions(patientId),
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      const fetchStart = performance.now();

      try {
        const response = await getPatientConditions(patientId);

        // Measure fetch performance
        performanceMonitor.measureFetch(
          `/conditions/patients/${patientId}`,
          fetchStart,
          {
            activeCount: response.counts.active,
            chronicCount: response.counts.chronic,
            resolvedCount: response.counts.resolved,
            totalCount: response.counts.total,
          }
        );

        return response;
      } catch (err) {
        logger.error('Error fetching conditions', err as Error, {
          component: 'useConditions',
          patientId,
        });
        throw err;
      }
    },
    enabled: !!patientId, // Only run query if patientId exists
    staleTime: 5 * 60 * 1000, // 5 minutes (same as QueryProvider default)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });

  // Log cache hits in development
  if (__DEV__ && conditions && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      // Only log if data is from cache (not fresh fetch)
      console.log(
        `[CACHE HIT] 💾 Conditions | Age: ${(age / 1000).toFixed(1)}s | Patient: ${patientId}`
      );
    }
  }

  return {
    conditions: conditions ?? null,
    isLoading: isLoading || isRefetching,
    error: error
      ? error instanceof Error
        ? error.message
        : 'Failed to load conditions'
      : null,
    refetch,
  };
};
