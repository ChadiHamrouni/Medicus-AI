import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusUserApiBaseUrl;

export interface MedicalProcedure {
  // Core identifiers
  id: number;
  patient_id: number;

  // Scheduling
  scheduled_date: string;
  scheduled_time?: string;

  // Display name (resolved: COALESCE(procedure.name, procedure_text))
  display_name?: string;

  // Clinical Reference Data (populated after medical coding)
  procedure_code?: string;
  cpt_code?: string;
  icd10_pcs_code?: string;

  // Provenance
  doctor_id?: number;
  doctor_name?: string;
  hc_provider_id?: number;
  healthcare_provider_name?: string;

  // Location
  location?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    [key: string]: any;
  };
  // Procedure execution
  summary?: {
    outcome?: string;
    notes?: string;
    risk_assessment?: string;
    [key: string]: any;
  };

  // Status: scheduled | active | completed | cancelled | missed
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'missed';

  // Timestamps
  cancelled_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface MedicalProceduresResponse {
  patient_id: number;
  procedures_list: MedicalProcedure[];
  counts: number;
  limit: number;
  offset: number;
}

/**
 * Get all medical procedures for a patient
 */
export const getMedicalProcedures = async (
  patientId: number
): Promise<MedicalProceduresResponse> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/procedures/patients/${patientId}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch medical procedures: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: MedicalProceduresResponse = await response.json();

    logger.info('Medical procedures fetched successfully', {
      component: 'ProceduresService',
      patientId,
      totalCount: data.counts,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch medical procedures', error as Error, {
      component: 'ProceduresService',
      patientId,
      errorDetails: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Get procedure details by ID
 */
export const getProcedureDetails = async (
  procedureId: number,
  patientId: number
): Promise<MedicalProcedure> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/procedures/${procedureId}/patients/${patientId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Procedure not found');
      }
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch procedure details: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: MedicalProcedure = await response.json();

    logger.info('Procedure details fetched successfully', {
      component: 'ProceduresService',
      procedureId,
      patientId,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch procedure details', error as Error, {
      component: 'ProceduresService',
      procedureId,
      patientId,
    });
    throw error;
  }
};