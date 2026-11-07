import {
  CreateDependentRequest,
  DependentListResponse,
  DependentResponse,
  SwitchContextResponse,
  UpdateDependentRequest,
} from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

// Create a new dependent patient
export const createDependent = async (
  data: CreateDependentRequest
): Promise<DependentResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/dependents/create`,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `POST /dependents/create failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    return response.json();
  } catch (error) {
    logger.error('Failed to create dependent', error as Error, {
      component: 'MedicusUserService',
      endpoint: 'POST /dependents/create',
    });
    throw error;
  }
};

// Update a dependent patient
export const updateDependent = async (
  patientId: number,
  data: UpdateDependentRequest
): Promise<DependentResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/dependents/${patientId}`,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `PUT /dependents/${patientId} failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    return response.json();
  } catch (error) {
    logger.error('Failed to update dependent', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

// Delete a dependent patient
export const deleteDependent = async (
  patientId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/dependents/${patientId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'DELETED' }),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `DELETE /dependents/${patientId} failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    return response.json();
  } catch (error) {
    logger.error('Failed to delete dependent', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

// Switch patient context
export const switchPatientContext = async (
  patientId: number
): Promise<SwitchContextResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/dependents/switch-context`,
      {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId }),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `POST /dependents/switch-context failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    return response.json();
  } catch (error) {
    logger.error('Failed to switch patient context', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

// Get all available patient contexts
export const getAvailablePatientContexts = async (): Promise<
  DependentResponse[]
> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/dependents/context/available`
    );

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `GET /dependents/context/available failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    return response.json();
  } catch (error) {
    logger.error('Failed to get available patient contexts', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Get all dependents for the current user
 */
export const getDependents = async (
  includeMain: boolean = true
): Promise<DependentListResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/dependents/?include_main=${includeMain}`
    );

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `GET /dependents/?include_main=${includeMain} failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data = await response.json();

    logger.info('Fetched dependents successfully', {
      component: 'MedicusUserService',
      dependentsCount: data?.dependents?.length || 0,
      total: data?.total || 0,
      hasMainPatient: !!data?.main_patient,
    });

    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch dependents', error as Error, {
      component: 'MedicusUserService',
      errorMessage,
      includeMain,
      url: `${API_BASE_URL}/dependents/?include_main=${includeMain}`,
    });
    throw error;
  }
};

// Get specific dependent by ID
export const getDependentById = async (
  patientId: number
): Promise<DependentResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/dependents/${patientId}`
    );

    if (!response.ok) {
      const responseText = await response.text();
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      throw new Error(
        `GET /dependents/${patientId} failed: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    return response.json();
  } catch (error) {
    logger.error('Failed to get dependent by ID', error as Error, {
      component: 'MedicusUserService',
      patientId,
    });
    throw error;
  }
};
