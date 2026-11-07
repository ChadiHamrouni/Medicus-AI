import { LanguagesResponse } from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Get available languages
 */
export const getLanguages = async (): Promise<LanguagesResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/reference/languages`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch languages: ${response.status}`);
    }

    const languages: LanguagesResponse = await response.json();
    return languages;
  } catch (error) {
    logger.error('Failed to fetch languages', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};
