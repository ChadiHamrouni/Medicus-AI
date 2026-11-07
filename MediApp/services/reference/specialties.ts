import { SpecialtiesResponse } from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Get available specialties
 */
export const getSpecialties = async (): Promise<SpecialtiesResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/reference/specialties`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch specialties: ${response.status}`);
    }

    const specialties: SpecialtiesResponse = await response.json();
    return specialties;
  } catch (error) {
    logger.error('Failed to fetch specialties', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Get available specialties (unauthenticated - for signup)
 */
export const getSpecialtiesPublic = async (): Promise<SpecialtiesResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reference/specialties`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch specialties: ${response.status}`);
    }

    const specialties: SpecialtiesResponse = await response.json();
    return specialties;
  } catch (error) {
    logger.error('Failed to fetch specialties (public)', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Get specialties, optionally filtered by super category
 */
export const getSpecialtiesFiltered = async (
  superCategoryId?: number
): Promise<{
  specialties: {
    id: number;
    name: string;
  }[];
  total: number;
}> => {
  try {
    const params = new URLSearchParams();
    if (superCategoryId) {
      params.append('super_category_id', superCategoryId.toString());
    }

    const url = `${API_BASE_URL}/reference/specialties${
      params.toString() ? '?' + params.toString() : ''
    }`;

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get specialties: ${response.status}`);
    }

    const result = await response.json();

    logger.info('Specialties fetched successfully', {
      component: 'MedicusUserService',
      total: result.count,
      superCategoryId,
    });

    return {
      specialties: result.specialties,
      total: result.count,
    };
  } catch (error) {
    logger.error('Failed to get specialties', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Get available specialty super categories
 */
export const getSpecialtySuperCategories = async (): Promise<{
  super_categories: {
    id: number;
    name: string;
    description: string;
    icon?: string;
  }[];
  total: number;
}> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/reference/specialty-super-categories`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get specialty super categories: ${response.status}`
      );
    }

    const result = await response.json();

    logger.info('Specialty super categories fetched successfully', {
      component: 'MedicusUserService',
      total: result.total,
    });

    return result;
  } catch (error) {
    logger.error('Failed to get specialty super categories', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};
