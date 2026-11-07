import { medicusUserApi } from '@/utils/infrastructure/typedApiClient';

/**
 * NEW ARCHITECTURE (Post-Refactor):
 * - Master knowledge base: conditions table with ICD10, is_chronic, category
 * - Patient records: medical_conditions links to knowledge base via condition_id
 * - Views provide: display_name, clinician_raw_input, clinical_status
 * - Records are IMMUTABLE (no updates, no deletes)
 */

export interface MedicalConditionsResponse {
  patient_id: number;
  active: MedicalCondition[];
  chronic: MedicalCondition[];
  resolved: MedicalCondition[];
  counts: {
    active: number;
    chronic: number;
    resolved: number;
    total: number;
  };
}

export interface MedicalCondition {
  id: number;
  condition_id?: number; // FK to conditions knowledge base (NULL if not yet coded)
  display_name: string; // Resolved condition name (translation > master > raw)
  clinician_raw_input?: string; // Doctor's original text input
  status: 'active' | 'chronic' | 'resolved'; // clinical_status from view
  severity?: string;
  category?: string; // Medical category from knowledge base
  diagnosis_date?: string;
  resolved_date?: string;
  icd10?: string; // ICD-10 code from knowledge base
  is_chronic: boolean; // Chronic status from knowledge base
  clinical_notes?: string; // Doctor's specific notes about this diagnosis
  doctor_name?: string;
}

export const getPatientConditions = async (
  patientId: number
): Promise<MedicalConditionsResponse> => {
  return medicusUserApi.get<MedicalConditionsResponse>(
    `conditions/patients/${patientId}`
  );
};
