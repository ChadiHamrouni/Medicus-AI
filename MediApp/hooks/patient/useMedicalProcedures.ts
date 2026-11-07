import { useQuery } from '@tanstack/react-query';
import { getMedicalProcedures, type MedicalProcedure } from '@/services';

/**
 * Hook to fetch and manage medical procedures for a patient.
 * Returns procedures sorted by scheduled_date descending (most recent first).
 */
export const useMedicalProcedures = (patientId: number | null) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['medical-procedures', patientId],
    queryFn: () => {
      if (!patientId) throw new Error('Patient ID is required');
      return getMedicalProcedures(patientId);
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sort procedures by scheduled_date descending (most recent first)
  const procedures = [...(data?.procedures_list || [])].sort((a, b) => {
    const dateA = new Date(a.scheduled_date).getTime();
    const dateB = new Date(b.scheduled_date).getTime();
    return dateB - dateA;
  });

  return {
    // All procedures sorted by date desc
    procedures,

    // Total count
    totalCount: data?.counts || 0,

    // Loading states
    isLoading,
    error,

    // Refetch
    refetch,
  };
};

/**
 * Hook to get procedure summary (for cards/badges)
 */
export const useProcedureSummary = (patientId: number | null) => {
  const { procedures, totalCount, isLoading } = useMedicalProcedures(patientId);

  // Get next 3 scheduled procedures
  const scheduledProcedures = procedures
    .filter(p => p.status === 'scheduled')
    .slice(0, 3);

  return {
    nextProcedures: scheduledProcedures,
    scheduledCount: procedures.filter(p => p.status === 'scheduled').length,
    totalCount,
    isLoading,
  };
};