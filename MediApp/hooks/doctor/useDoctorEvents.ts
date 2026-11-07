import { useQuery } from '@tanstack/react-query';
import {
  getDoctorEvents,
  GetDoctorEventsParams,
} from '@/services/doctor/events';
import { logger } from '@/utils';

/**
 * Hook to fetch doctor's calendar events
 */
export function useDoctorEvents(params: GetDoctorEventsParams) {
  return useQuery({
    queryKey: ['doctorEvents', params],
    queryFn: () => getDoctorEvents(params),
    enabled: !!params.doctorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    onError: error => {
      logger.error('Failed to fetch doctor events', error as Error, {
        component: 'useDoctorEvents',
        doctorId: params.doctorId,
      });
    },
  });
}
