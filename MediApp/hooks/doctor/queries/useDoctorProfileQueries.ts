/**
 * TanStack Query hooks for doctor profile data fetching
 */

import {
  getDoctorProfile,
  getCountries,
  getLanguages,
  getSpecialties,
  getSpecialtiesPublic,
} from '@/services';
import type {
  CountriesResponse,
  DoctorProfileResponse,
  LanguagesResponse,
  SpecialtiesResponse,
} from '@/types';
import { logger } from '@/utils';
import { performanceMonitor } from '@/utils/performance';
import { useQuery } from '@tanstack/react-query';
import { SHARED_QUERY_CONFIG } from '../../shared/useQueryConfig';
import { doctorQueryKeys } from '../queryKeys';

export const DOCTOR_PROFILE_QUERY_KEYS = doctorQueryKeys;

/**
 * Hook to get current doctor's profile
 */
export function useDoctorProfileQuery(enabled: boolean = true) {
  const {
    data: profile,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: doctorQueryKeys.profile(),
    queryFn: async (): Promise<DoctorProfileResponse> => {
      const fetchStart = performance.now();

      try {
        logger.info('Fetching doctor profile', {
          component: 'useDoctorProfileQuery',
        });

        const profile = await getDoctorProfile();

        performanceMonitor.measureFetch('/doctor/profile', fetchStart, {
          profileId: profile.id,
          completionPercentage: profile.profile_completion_percentage,
        });

        logger.info('Doctor profile fetched successfully', {
          component: 'useDoctorProfileQuery',
          profileId: profile.id,
          completionPercentage: profile.profile_completion_percentage,
        });

        return profile;
      } catch (error) {
        logger.error('Failed to fetch doctor profile', error as Error, {
          component: 'useDoctorProfileQuery',
        });
        throw error;
      }
    },
    enabled,
    ...SHARED_QUERY_CONFIG.DOCTOR_PROFILE,
    meta: {
      errorMessage: 'Failed to load doctor profile',
    },
  });

  if (__DEV__ && profile && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      logger.info(
        `[CACHE HIT] 💾 Doctor Profile | Age: ${(age / 1000).toFixed(1)}s | ID: ${profile.id}`
      );
    }
  }

  return {
    data: profile,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
    isFetching,
  };
}

/**
 * Hook to get available specialties
 */
export function useSpecialtiesQuery() {
  const {
    data: specialties,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: doctorQueryKeys.specialties(),
    queryFn: async (): Promise<SpecialtiesResponse> => {
      const fetchStart = performance.now();

      try {
        logger.info('Fetching specialties', {
          component: 'useSpecialtiesQuery',
        });

        const specialties = await getSpecialties();

        performanceMonitor.measureFetch('/doctor/specialties', fetchStart, {
          count: specialties.count,
        });

        logger.info('Specialties fetched successfully', {
          component: 'useSpecialtiesQuery',
          count: specialties.count,
        });

        return specialties;
      } catch (error) {
        logger.error('Failed to fetch specialties', error as Error, {
          component: 'useSpecialtiesQuery',
        });
        throw error;
      }
    },
    ...SHARED_QUERY_CONFIG.SPECIALTIES,
    meta: {
      errorMessage: 'Failed to load specialties',
    },
  });

  if (__DEV__ && specialties && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      logger.info(
        `[CACHE HIT] 💾 Specialties | Age: ${(age / 1000).toFixed(1)}s | Count: ${specialties.count}`
      );
    }
  }

  return {
    data: specialties,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  };
}

/**
 * Hook to get available specialties (unauthenticated - for signup)
 */
export function useSpecialtiesPublicQuery() {
  const {
    data: specialties,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: doctorQueryKeys.specialtiesPublic(),
    queryFn: async (): Promise<SpecialtiesResponse> => {
      const fetchStart = performance.now();

      try {
        logger.info('Fetching specialties (public)', {
          component: 'useSpecialtiesPublicQuery',
        });

        const specialties = await getSpecialtiesPublic();

        performanceMonitor.measureFetch('/public/specialties', fetchStart, {
          count: specialties.count,
        });

        logger.info('Specialties fetched successfully (public)', {
          component: 'useSpecialtiesPublicQuery',
          count: specialties.count,
        });

        return specialties;
      } catch (error) {
        logger.error('Failed to fetch specialties (public)', error as Error, {
          component: 'useSpecialtiesPublicQuery',
        });
        throw error;
      }
    },
    ...SHARED_QUERY_CONFIG.SPECIALTIES,
    meta: {
      errorMessage: 'Failed to load specialties',
    },
  });

  if (__DEV__ && specialties && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      logger.info(
        `[CACHE HIT] 💾 Specialties (Public) | Age: ${(age / 1000).toFixed(1)}s | Count: ${specialties.count}`
      );
    }
  }

  return {
    data: specialties,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  };
}

/**
 * Hook to get available languages
 */
export function useLanguagesQuery() {
  const {
    data: languages,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: doctorQueryKeys.languages(),
    queryFn: async (): Promise<LanguagesResponse> => {
      const fetchStart = performance.now();

      try {
        logger.info('Fetching languages', {
          component: 'useLanguagesQuery',
        });

        const languages = await getLanguages();

        performanceMonitor.measureFetch('/doctor/languages', fetchStart, {
          count: languages.count,
        });

        logger.info('Languages fetched successfully', {
          component: 'useLanguagesQuery',
          count: languages.count,
        });

        return languages;
      } catch (error) {
        logger.error('Failed to fetch languages', error as Error, {
          component: 'useLanguagesQuery',
        });
        throw error;
      }
    },
    ...SHARED_QUERY_CONFIG.STATIC,
    meta: {
      errorMessage: 'Failed to load languages',
    },
  });

  if (__DEV__ && languages && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      logger.info(
        `[CACHE HIT] 💾 Languages | Age: ${(age / 1000).toFixed(1)}s | Count: ${languages.count}`
      );
    }
  }

  return {
    data: languages,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  };
}
/**
 * Hook to get available countries
 */
export function useCountriesQuery() {
  const {
    data: countriesData,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: doctorQueryKeys.countries(),
    queryFn: async (): Promise<CountriesResponse> => {
      const fetchStart = performance.now();

      try {
        logger.info('Fetching countries', {
          component: 'useCountriesQuery',
        });

        const countries = await getCountries();

        performanceMonitor.measureFetch('/doctor/countries', fetchStart, {
          count: countries.total,
        });

        logger.info('Countries fetched successfully', {
          component: 'useCountriesQuery',
          count: countries.total,
        });

        // Transform the response to match CountriesResponse interface
        return {
          countries: countries.countries,
          count: countries.total,
        };
      } catch (error) {
        logger.error('Failed to fetch countries', error as Error, {
          component: 'useCountriesQuery',
        });
        throw error;
      }
    },
    ...SHARED_QUERY_CONFIG.COUNTRIES,
    meta: {
      errorMessage: 'Failed to load countries',
    },
  });

  if (__DEV__ && countriesData && !isFetching) {
    const age = Date.now() - dataUpdatedAt;
    if (age > 100) {
      logger.info(
        `[CACHE HIT] 💾 Countries | Age: ${(age / 1000).toFixed(1)}s | Count: ${countriesData.count}`
      );
    }
  }

  return {
    data: countriesData,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  };
}
