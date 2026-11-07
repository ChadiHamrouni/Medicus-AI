import { DoctorProfileResponse } from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Get doctor information by ID
 */
export const getDoctorById = async (
  doctorId: number
): Promise<{
  id: number;
  user_id?: number;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  specialty?: string;
  specialty_name?: string;
  specialty_id?: number;
  country_name?: string;
  country_id?: number;
  email?: string | null;
  rating?: number | null;
  review_count?: number;
  avatar?: string;
}> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/${doctorId}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Doctor with ID ${doctorId} not found`);
      }
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch doctor: ${response.status} ${response.statusText}${errorText ? `. ${errorText}` : ''}`
      );
    }

    const data = await response.json();

    logger.info('Doctor fetched successfully', {
      component: 'MedicusUserService',
      doctorId,
      data,
      doctorName: data.name,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch doctor', error as Error, {
      component: 'MedicusUserService',
      doctorId,
    });
    throw error;
  }
};

/**
 * Get doctor profile
 */
export const getDoctorProfile = async (): Promise<DoctorProfileResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/doctor/profile`);

    if (!response.ok) {
      throw new Error(`Failed to fetch doctor profile: ${response.status}`);
    }

    const profile: DoctorProfileResponse = await response.json();
    logger.debug('Doctor profile fetched successfully', {
      component: 'MedicusUserService',
      profileId: profile.id,
    });
    return profile;
  } catch (error) {
    logger.error('Failed to fetch doctor profile', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Get doctor's public profile by ID (for patient viewing doctor from conversation)
 * Returns detailed profile including working hours, certifications, procedures, etc.
 */
export const getDoctorPublicProfile = async (
  doctorId: number
): Promise<DoctorProfileResponse> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/${doctorId}/public-profile`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Doctor with ID ${doctorId} not found`);
      }
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch doctor public profile: ${response.status} ${response.statusText}${errorText ? `. ${errorText}` : ''}`
      );
    }

    const profile: DoctorProfileResponse = await response.json();

    logger.info('Doctor public profile fetched successfully', {
      component: 'MedicusUserService',
      doctorId,
      doctorName: profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
    });

    return profile;
  } catch (error) {
    logger.error('Failed to fetch doctor public profile', error as Error, {
      component: 'MedicusUserService',
      doctorId,
    });
    throw error;
  }
};
