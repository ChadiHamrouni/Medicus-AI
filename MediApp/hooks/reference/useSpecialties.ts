import { useQuery } from '@tanstack/react-query';
import { getSpecialtiesFiltered } from '@/services';
import { logger } from '@/utils';

export const useSpecialties = () => {
    return useQuery({
        queryKey: ['specialties'],
        queryFn: async () => {
            try {
                const response = await getSpecialtiesFiltered();
                return response.specialties;
            } catch (error) {
                logger.error('Failed to fetch specialties', error as Error, {
                    component: 'useSpecialties',
                });
                throw error;
            }
        },
        staleTime: 60 * 60 * 1000, // 1 hour stale time (specialties rarely change)
        gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    });
};
