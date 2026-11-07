import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getMedicalEvents,
  MedicalEventEntry,
} from '@/services/patient/medicalEvents';
import { logger } from '@/utils';
import { performanceMonitor } from '@/utils/performance';
import { medicalQueryKeys } from './queryKeys';

export interface MedicalEvent {
  id: string;
  type: 'visit' | 'exam' | 'exam_order' | 'procedure';
  date: string;
  time: string;
  title: string;
  doctor_name: string | null;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  healthcare_provider_name: string | null;
  event_details: Record<string, any> | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  details: string;
  exam_type?: string;
  specialty?: string;
}

/**
 * Transform backend MedicalEventEntry to frontend MedicalEvent format
 */
const transformEvent = (entry: MedicalEventEntry): MedicalEvent => {
  // Determine UI status based on backend status and date
  const now = new Date();
  const eventDate = new Date(entry.event_date);
  const isUpcoming = eventDate >= now && entry.status === 'active';

  return {
    id: `${entry.event_type}-${entry.event_id}`,
    type: entry.event_type,
    date: entry.event_date,
    time: entry.event_time || 'TBD',
    title:
      entry.event_name
        ?.replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()) || 'Medical Event',
    doctor_name: entry.doctor_name,
    location: entry.event_location,
    healthcare_provider_name: entry.healthcare_provider_name,
    event_details: entry.event_details,
    status: isUpcoming ? 'upcoming' : 'completed',
    details: entry.event_summary || 'No details provided',
    exam_type: entry.event_name,
  };
};

/**
 * Hook to fetch and manage medical events (visits + exams) for a patient using React Query
 *
 * Features:
 * - Automatic caching (5 min stale time)
 * - Request deduplication
 * - Background refetch on reconnect
 * - Automatic retry with exponential backoff
 * - Performance instrumentation
 */
export const useMedicalEvents = (
  patientId: number | null,
  includeCompleted: boolean = false
) => {
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: medicalQueryKeys.events(patientId, 500, 0),
    queryFn: async () => {
      if (!patientId) {
        throw new Error('Patient ID is required');
      }

      const fetchStart = performance.now();

      try {
        const response = await getMedicalEvents(patientId, 500, 0);

        // Measure fetch performance
        performanceMonitor.measureFetch(
          `/medical-events/patients/${patientId}`,
          fetchStart,
          {
            totalEvents: response.total,
            limit: response.limit,
            offset: response.offset,
          }
        );

        return response;
      } catch (err) {
        logger.error('Error fetching medical events', err as Error, {
          component: 'useMedicalEvents',
          patientId,
        });
        throw err;
      }
    },
    enabled: !!patientId, // Only run query if patientId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });

  // Transform and memoize events
  const events = useMemo(() => {
    if (!eventsData?.events) return [];
    return eventsData.events.map(transformEvent);
  }, [eventsData]);

  // Separate upcoming and past events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now && event.status === 'upcoming';
    });
  }, [events]);

  const pastEvents = useMemo(() => {
    const now = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate < now || event.status === 'completed';
    });
  }, [events]);

  const cancelledEvents = useMemo(() => {
    return events.filter(event => event.status === 'cancelled');
  }, [events]);

  // Log cache hits in development
  if (__DEV__ && eventsData && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      // Only log if data is from cache (not fresh fetch)
      console.log(
        `[CACHE HIT] 💾 Medical Events | Age: ${(age / 1000).toFixed(1)}s | Patient: ${patientId}`
      );
    }
  }

  return {
    // All events
    events,
    upcomingEvents,
    pastEvents,
    cancelledEvents,

    // Counts
    upcomingCount: upcomingEvents.length,
    pastCount: pastEvents.length,
    totalCount: events.length,

    // Loading states
    isLoading: isLoading || isRefetching,
    error: error
      ? error instanceof Error
        ? error.message
        : 'Failed to load medical events'
      : null,

    // Refetch
    refetch,
  };
};

/**
 * Hook to get upcoming events summary (for the profile card)
 */
export const useUpcomingEventsSummary = (patientId: number | null) => {
  const { upcomingEvents, upcomingCount, isLoading } = useMedicalEvents(
    patientId,
    false
  );

  // Get next 3 upcoming events
  const nextEvents = useMemo(() => {
    return upcomingEvents.slice(0, 3);
  }, [upcomingEvents]);

  return {
    nextEvents,
    upcomingCount,
    isLoading,
  };
};
