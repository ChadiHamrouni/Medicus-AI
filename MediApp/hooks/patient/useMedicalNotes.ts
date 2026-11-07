import { useQuery } from '@tanstack/react-query';
import { getMedicalNotes, type MedicalNote } from '@/services';

/**
 * Hook to fetch and manage medical notes for a patient
 */
export const useMedicalNotes = (patientId: number | null, limit?: number) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['medical-notes', patientId, limit],
    queryFn: () => {
      if (!patientId) throw new Error('Patient ID is required');
      return getMedicalNotes(patientId, limit);
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    // All notes (ordered by date DESC from backend)
    notes: data?.notes || [],

    // Total count
    total: data?.total || 0,

    // Loading states
    isLoading,
    error,

    // Refetch
    refetch,
  };
};

/**
 * Hook to get recent notes summary (for cards/badges)
 */
export const useRecentNotes = (patientId: number | null, count: number = 3) => {
  const { notes, total, isLoading } = useMedicalNotes(patientId, count);

  return {
    recentNotes: notes,
    totalNotes: total,
    isLoading,
  };
};
