import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusUserApiBaseUrl;

// SOAP Note structure matching backend
export interface Subjective {
  chief_complaint: string;
  hpi?: string;
  ros?: string;
  medical_history?: string;
  family_history?: string;
  social_history?: string;
  medications?: string[];
  allergies?: string[];
  patient_quotes?: string[];
}

export interface Objective {
  vital_signs?: string;
  physical_exam?: string;
}

export interface Assessment {
  diagnosis?: string;
  differential_diagnosis?: string[];
  progress?: string;
  summary?: string;
}

export interface Plan {
  treatment?: string;
  medications?: string[];
  further_tests?: string[];
  referrals?: string[];
  patient_education?: string[];
  follow_up?: string;
  goals?: string[];
}

export interface NoteDetail {
  subjective: Subjective;
  objective?: Objective;
  assessment?: Assessment;
  plan?: Plan;
}

export interface MedicalNote {
  id: number;
  patient_id: number;
  doctor_id: number;
  doctor_name: string;
  note_date: string;
  note_details: NoteDetail;
}

export interface MedicalNotesResponse {
  patient_id: number;
  notes: MedicalNote[];
  total: number;
}

/**
 * Get all medical notes for a patient
 */
export const getMedicalNotes = async (
  patientId: number,
  limit?: number
): Promise<MedicalNotesResponse> => {
  try {
    const params = new URLSearchParams();
    if (limit) {
      params.append('limit', limit.toString());
    }

    const url = `${MEDICUS_BASE_URL}/notes/patients/${patientId}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch medical notes: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: MedicalNotesResponse = await response.json();

    logger.info('Medical notes fetched successfully', {
      component: 'NotesService',
      patientId,
      totalCount: data.total,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch medical notes', error as Error, {
      component: 'NotesService',
      patientId,
    });
    throw error;
  }
};

/**
 * Get a specific medical note by ID
 */
export const getMedicalNoteById = async (
  noteId: number
): Promise<MedicalNote> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/notes/${noteId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Note not found');
      }
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch note: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: MedicalNote = await response.json();

    logger.info('Medical note fetched successfully', {
      component: 'NotesService',
      noteId,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch medical note', error as Error, {
      component: 'NotesService',
      noteId,
    });
    throw error;
  }
};
