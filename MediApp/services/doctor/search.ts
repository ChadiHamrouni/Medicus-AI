import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Search for doctors using materialized views
 * Returns both in-network and out-of-network doctors
 */
export const searchDoctors = async ({
  query,
  page = 1,
  pageSize = 20,
  // eslint-disable-next-line no-unused-vars
  includeForeignDoctors = false,
  includeOutOfNetwork = true,
  foreignCountryId,
  specialtyId,
  superCategoryId,
  userCountryId,
}: {
  query?: string;
  page?: number;
  pageSize?: number;
  includeForeignDoctors?: boolean;
  includeOutOfNetwork?: boolean;
  foreignCountryId?: number;
  specialtyId?: number;
  superCategoryId?: number;
  userCountryId?: number;
} = {}): Promise<{
  doctors: {
    id: number;
    user_id?: number | null;
    name: string;
    first_name?: string;
    last_name?: string;
    prefix?: string;
    specialty_name?: string;
    specialty_id?: number;
    super_category_id?: number;
    country_name?: string;
    country_id?: number;
    language_id?: number;
    language_name?: string;
    gender?: string;
    email?: string | null;
    in_network: boolean;
    is_same_country?: boolean;
    search_mode?: 'local' | 'foreign';
    rating?: number | null;
    review_count?: number;
    avatar?: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      include_out_of_network: includeOutOfNetwork.toString(),
    });

    // Handle foreign country search - prioritize foreignCountryId over includeForeignDoctors
    if (foreignCountryId) {
      params.append('search_foreign_country', foreignCountryId.toString());
    }

    if (specialtyId) {
      params.append('specialty_id', specialtyId.toString());
    }

    if (superCategoryId) {
      params.append('super_category_id', superCategoryId.toString());
    }

    if (query && query.trim()) {
      params.append('query', query.trim());
    }

    // Pass user's country for geographic filtering
    if (userCountryId) {
      params.append('user_country_id', userCountryId.toString());
    }

    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to search doctors: ${response.status}`);
    }

    const result = await response.json();

    logger.info('Doctors search successful using materialized views', {
      component: 'MedicusUserService',
      total: result.total,
      page: result.page,
      totalPages: result.total_pages,
      query: query || 'all',
      foreignCountryId,
      specialtyId,
      superCategoryId,
      inNetwork: result.doctors.filter((d: any) => d.in_network).length,
      outOfNetwork: result.doctors.filter((d: any) => !d.in_network).length,
    });

    return {
      doctors: result.doctors || [],
      total: result.total || 0,
      page: result.page || page,
      pageSize: result.page_size || pageSize,
      totalPages:
        result.total_pages || Math.ceil((result.total || 0) / pageSize),
    };
  } catch (error) {
    logger.error('Failed to search doctors', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Search for out-of-network doctors using doctors_oon_view
 * Used when patient toggles "include out of network" in discovery page
 */
export const searchOONDoctors = async ({
  query,
  specialtyId,
  superCategoryId,
  userCountryId,
  page = 1,
  pageSize = 20,
}: {
  query?: string;
  specialtyId?: number;
  superCategoryId?: number;
  userCountryId?: number;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  doctors: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    prefix?: string;
    specialty_id?: number;
    specialty_name?: string;
    super_category_id?: number;
    country_id?: number;
    country_name?: string;
    language_id?: number;
    language_name?: string;
    wa_number?: string;
    email?: string | null;
    phone?: string | null;
    city?: string;
    state?: string;
    country?: string;
    in_network: false;
    data_source?: string;
    avatar_url?: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (specialtyId) {
      params.append('specialty_id', specialtyId.toString());
    }

    if (superCategoryId) {
      params.append('super_category_id', superCategoryId.toString());
    }

    if (userCountryId) {
      params.append('country_id', userCountryId.toString());
    }

    if (query && query.trim()) {
      params.append('query', query.trim());
    }

    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/search/oon?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to search OON doctors: ${response.status}`);
    }

    const result = await response.json();

    logger.info('OON doctors search successful', {
      component: 'MedicusUserService',
      total: result.total,
      page: result.page,
      totalPages: result.total_pages,
      query: query || 'all',
      specialtyId,
      superCategoryId,
    });

    return {
      doctors: result.doctors || [],
      total: result.total || 0,
      page: result.page || page,
      pageSize: result.page_size || pageSize,
      totalPages:
        result.total_pages || Math.ceil((result.total || 0) / pageSize),
    };
  } catch (error) {
    logger.error('Failed to search OON doctors', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};
