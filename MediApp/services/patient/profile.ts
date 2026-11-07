import { MedicalHistoryResponse, PatientProfileResponse } from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Get patient by phone number
 */
export const getPatientByPhone = async (
  phoneNumber: string
): Promise<PatientProfileResponse> => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/patients/by-phone/${phoneNumber}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get patient by phone: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get current patient profile data
 */
export const getCurrentPatientProfile = async (
  userData?: any
): Promise<PatientProfileResponse> => {
  try {
    logger.info('Fetching current patient profile', {
      component: 'MedicusUserService',
    });

    const patientId = userData?.id;

    logger.info('Patient ID extracted, fetching patient profile', {
      component: 'MedicusUserService',
      userId: userData.id,
      patientId,
      userDataProvided: !!userData,
    });

    // Now fetch the patient profile using the patient ID
    const response = await authenticatedFetch(
      `${API_BASE_URL}/patients/by-user/${patientId}`
    );

    if (!response.ok) {
      const responseText = await response.text();
      logger.error(
        `GET /patients/${patientId} failed: ${response.status} ${response.statusText}. ${responseText}`,
        undefined,
        {
          component: 'MedicusUserService',
          status: response.status,
          statusText: response.statusText,
          responseText,
          patientId,
        }
      );

      let errorMessage = `Failed to fetch patient profile: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData?.detail || errorData?.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const profile = await response.json();

    logger.info('Patient profile fetched successfully', {
      component: 'MedicusUserService',
      profileId: profile,
      patientId,
    });

    return profile;
  } catch (error) {
    logger.error('Failed to fetch patient profile', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Get patient by ID
 */
export const getPatientById = async (
  patientId: number
): Promise<PatientProfileResponse> => {
  try {
    logger.info('Fetching patient by ID', {
      component: 'MedicusUserService',
      patientId,
    });

    const response = await authenticatedFetch(
      `${API_BASE_URL}/patients/${patientId}`
    );

    if (!response.ok) {
      const responseText = await response.text();
      logger.error(
        `GET /patients/${patientId} failed: ${response.status} ${response.statusText}. ${responseText}`,
        undefined,
        {
          component: 'MedicusUserService',
          status: response.status,
          statusText: response.statusText,
          responseText,
          patientId,
        }
      );

      let errorMessage = `Failed to fetch patient: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData?.detail || errorData?.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const patient = await response.json();

    logger.info('Patient fetched successfully', {
      component: 'MedicusUserService',
      patientId: patient.id,
    });

    return patient;
  } catch (error) {
    logger.error('Failed to fetch patient by ID', error as Error, {
      component: 'MedicusUserService',
      patientId,
    });
    throw error;
  }
};

/**
 * Get comprehensive medical history for a patient
 * Fetches visits, examinations, and prescriptions in a unified timeline
 */
export const getMedicalHistory = async (
  patientId: number,
  filters?: {
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    recordTypes?: string[]; // e.g., ['visit', 'test', 'prescription']
    limit?: number;
    offset?: number;
  }
): Promise<MedicalHistoryResponse> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (filters?.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('end_date', filters.endDate);
    }
    if (filters?.recordTypes && filters.recordTypes.length > 0) {
      params.append('record_types', filters.recordTypes.join(','));
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.offset) {
      params.append('offset', filters.offset.toString());
    }

    const url = `${API_BASE_URL}/medical-history/patients/${patientId}${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    logger.info('Fetching medical history', {
      component: 'MedicusUserService',
      patientId,
      filters,
      url,
    });

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `GET /medical-history/patients/${patientId} failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data = await response.json();

    logger.info('Fetched medical history successfully', {
      component: 'MedicusUserService',
      patientId,
      totalRecords: data?.summary?.total_records || 0,
      recordsReturned: data?.records?.length || 0,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch medical history', error as Error, {
      component: 'MedicusUserService',
      patientId,
      filters,
    });
    throw error;
  }
};
