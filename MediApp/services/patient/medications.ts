import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusUserApiBaseUrl;

// Medication interfaces matching the backend MedicationEntry model
export interface Medication {
  id: number;
  medication_name: string;
  strength: string | null;
  form: string | null;
  dose: string | null;
  frequency: string | null;
  time_of_day: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'current' | 'previous';
  duration_days: number | null;
  days_taken: number | null;
  days_left: number | null;
  purpose: string | null;
  instructions: string | null;
  prescribed_by: string | null;
  prescribed_at: string | null;
  source: string | null;
}

export interface CurrentMedicationsResponse {
  patient_id: number;
  current: Medication[];
  previous: Medication[];
  counts: {
    current: number;
    previous: number;
    total: number;
  };
}

export interface MedicationSummary {
  patient_id: number;
  total_prescriptions: number;
  active_medications_count: number;
  unique_medications_count: number;
  recent_prescriptions: {
    date_prescribed: string;
    doctor_name: string;
    medication_count: number;
    medications: string[];
  }[];
  summary_generated_at: string;
}

export interface PrescriptionRecord {
  date_prescribed: string;
  medications: {
    name: string;
    dosage: string;
    frequency?: string;
    duration?: string;
    purpose?: string;
  }[];
  doctor_name: string;
  notes?: string;
}

export interface MedicationCategory {
  name: string;
  count: number;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    prescribed_by: string;
    date_prescribed: string;
  }[];
}

export interface MedicationCategoriesResponse {
  patient_id: number;
  total_categories: number;
  total_medications: number;
  categories: MedicationCategory[];
}

/**
 * Get current medications for a patient
 */
export const getCurrentMedications = async (
  patientId: number,
  limit: number = 50,
  offset: number = 0
): Promise<CurrentMedicationsResponse> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/medications/patients/${patientId}?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch current medications: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: CurrentMedicationsResponse = await response.json();

    logger.info('Current medications fetched successfully', {
      component: 'MedicationService',
      patientId,
      currentCount: data.counts.current,
      previousCount: data.counts.previous,
      total: data.counts.total,
    });

    return data;
  } catch (error) {
    console.log('[MEDICATIONS DEBUG] Full error:', error);
    console.log('[MEDICATIONS DEBUG] Error message:', (error as Error).message);
    console.log('[MEDICATIONS DEBUG] Error stack:', (error as Error).stack);
    logger.error('Failed to fetch current medications', error as Error, {
      component: 'MedicationService',
      patientId,
    });
    throw error;
  }
};

/**
 * Get prescription history for a patient
 */
export const getPrescriptionHistory = async (
  patientId: number,
  limit: number = 50,
  offset: number = 0
): Promise<PrescriptionRecord[]> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/medications/patients/${patientId}/history?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch prescription history: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: PrescriptionRecord[] = await response.json();

    logger.info('Prescription history fetched successfully', {
      component: 'MedicationService',
      patientId,
      recordsCount: data.length,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch prescription history', error as Error, {
      component: 'MedicationService',
      patientId,
    });
    throw error;
  }
};

/**
 * Get medication summary for a patient
 */
export const getMedicationSummary = async (
  patientId: number
): Promise<MedicationSummary> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/medications/patients/${patientId}/summary`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch medication summary: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: MedicationSummary = await response.json();

    logger.info('Medication summary fetched successfully', {
      component: 'MedicationService',
      patientId,
      totalPrescriptions: data.total_prescriptions,
      activeMedicationsCount: data.active_medications_count,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch medication summary', error as Error, {
      component: 'MedicationService',
      patientId,
    });
    throw error;
  }
};

/**
 * Search medications for a specific patient
 */
export const searchPatientMedications = async (
  patientId: number,
  medicationName: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  patient_id: number;
  search_term: string;
  total_matches: number;
  returned_count: number;
  medications: Medication[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/medications/patients/${patientId}/search?medication_name=${encodeURIComponent(medicationName)}&limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to search patient medications: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    logger.info('Patient medications search completed', {
      component: 'MedicationService',
      patientId,
      searchTerm: medicationName,
      totalMatches: data.total_matches,
    });

    return data;
  } catch (error) {
    logger.error('Failed to search patient medications', error as Error, {
      component: 'MedicationService',
      patientId,
      medicationName,
    });
    throw error;
  }
};

/**
 * Get medication categories for a patient
 */
export const getMedicationCategories = async (
  patientId: number
): Promise<MedicationCategoriesResponse> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/medications/patients/${patientId}/categories`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch medication categories: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: MedicationCategoriesResponse = await response.json();

    logger.info('Medication categories fetched successfully', {
      component: 'MedicationService',
      patientId,
      totalCategories: data.total_categories,
      totalMedications: data.total_medications,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch medication categories', error as Error, {
      component: 'MedicationService',
      patientId,
    });
    throw error;
  }
};

/**
 * Get prescription details by ID
 */
export const getPrescriptionDetails = async (prescriptionId: number) => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/medications/prescriptions/${prescriptionId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Prescription not found');
      }
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch prescription details: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    logger.info('Prescription details fetched successfully', {
      component: 'MedicationService',
      prescriptionId,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch prescription details', error as Error, {
      component: 'MedicationService',
      prescriptionId,
    });
    throw error;
  }
};
