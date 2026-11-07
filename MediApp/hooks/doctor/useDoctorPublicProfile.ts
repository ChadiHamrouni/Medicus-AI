import { useQuery } from '@tanstack/react-query';
import { getDoctorPublicProfile } from '@/services/doctor/profile';
import { logger } from '@/utils';
import { DoctorProfileResponse } from '@/types';

export const useDoctorPublicProfile = (doctorId?: number) => {
    return useQuery({
        queryKey: ['doctorPublicProfile', doctorId],
        queryFn: async () => {
            if (!doctorId) throw new Error('Doctor ID is required');

            try {
                const profile = await getDoctorPublicProfile(doctorId);
                return profile;
            } catch (error) {
                logger.error('Failed to fetch doctor public profile', error as Error, {
                    component: 'useDoctorPublicProfile',
                    doctorId,
                });
                throw error;
            }
        },
        enabled: !!doctorId,
        staleTime: 5 * 60 * 1000, // 5 minutes stale time
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });
};
