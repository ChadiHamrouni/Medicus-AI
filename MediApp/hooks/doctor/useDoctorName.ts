import { useState, useEffect } from 'react';
import { MedicationUtils } from '@/utils';
import { MedicationData } from '@/stores/patientStore';

/**
 * Hook to enhance medication with doctor name
 */
export const useDoctorName = (medication: MedicationData) => {
  const [doctorName, setDoctorName] = useState<string>(
    medication.prescribed_by
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDoctorName = async () => {
      // Skip if already has a proper name (doesn't match "Doctor X" pattern)
      if (!medication.prescribed_by.match(/Doctor (\d+)/)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const enhancedName =
          await MedicationUtils.formatDoctorNameAsync(medication);
        if (enhancedName !== medication.prescribed_by) {
          setDoctorName(enhancedName);
        }
      } catch {
        setError('Failed to load doctor information');
        // Keep the original name if fetching fails
        setDoctorName(medication.prescribed_by);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctorName();
  }, [medication.prescribed_by, medication]);

  return {
    doctorName,
    isLoading,
    error,
  };
};
