import { useQuery } from '@tanstack/react-query';
import {
  getPatientVitals,
  MedicalVitalsResponse,
} from '@/services/patient/vitals';
import { logger } from '@/utils';
import { performanceMonitor } from '@/utils/performance';
import { medicalQueryKeys } from './queryKeys';

/**
 * Hook to fetch and manage patient vitals data using React Query
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Request deduplication
 * - Background refetch on reconnect
 * - Automatic retry with exponential backoff
 * - Performance instrumentation
 */
export const useVitals = (patientId: number | null) => {
  const {
    data: vitals,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: medicalQueryKeys.vitals(patientId),
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      const fetchStart = performance.now();

      try {
        const response = await getPatientVitals(patientId);

        // Measure fetch performance
        performanceMonitor.measureFetch(
          `/vitals/patients/${patientId}`,
          fetchStart,
          {
            hasVitals: !!response.vitals,
            hasBodyMetrics: !!response.body_metrics,
            hasLifestyle: !!response.lifestyle,
          }
        );

        return response;
      } catch (err) {
        console.error('[useVitals] Error:', err);
        logger.error('Error fetching vitals', err as Error, {
          component: 'useVitals',
          patientId,
        });
        throw err;
      }
    },
    enabled: !!patientId, // Only run query if patientId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });

  // Log cache hits in development
  if (__DEV__ && vitals && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      // Only log if data is from cache (not fresh fetch)
      console.log(
        `[CACHE HIT] 💾 Vitals | Age: ${(age / 1000).toFixed(1)}s | Patient: ${patientId}`
      );
    }
  }

  return {
    vitals: vitals ?? null,
    isLoading: isLoading || isRefetching,
    error: error
      ? error instanceof Error
        ? error.message
        : 'Failed to load vitals'
      : null,
    refetch,
  };
};
