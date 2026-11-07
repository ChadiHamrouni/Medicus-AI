import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Get all countries from the countries table
 */
export const getCountries = async (): Promise<{
  countries: {
    id: number;
    name: string;
  }[];
  total: number;
}> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/reference/countries`
    );

    if (!response.ok) {
      throw new Error(`Failed to get countries: ${response.status} `);
    }

    const result = await response.json();

    logger.info('Countries fetched successfully', {
      component: 'MedicusUserService',
      total: result.count,
    });

    return {
      countries: result.countries,
      total: result.count,
    };
  } catch (error) {
    logger.error('Failed to get countries', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};
