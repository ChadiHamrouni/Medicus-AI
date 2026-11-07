import { useState, useEffect, useCallback } from 'react';
import { searchDoctors } from '@/services';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useDoctorProfile } from '../../doctor/useDoctorProfile';
import { usePatientContext } from './usePatientContext';
import { logger } from '@/utils';

export interface Doctor {
  id: number;
  name: string;
  email: string;
  role: string;
  display_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  // For compatibility with mock data format
  specialty?: string;
  specialty_id?: number;
  rating?: number;
  reviewCount?: number;
  distance?: string;
  languages?: string[];
  badges?: string[];
  avatar?: string;
  user_id?: number;
  inNetwork?: boolean;
  phone?: string;
  address?: string;
  country_name?: string;
  country_id?: number;
  is_same_country?: boolean;
}

export interface UseDoctorsResult {
  doctors: Doctor[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  includeForeignDoctors: boolean;
  setIncludeForeignDoctors: (include: boolean) => void;
  searchDoctorsWithParams: (params: {
    query?: string;
    includeOutOfNetwork?: boolean;
    foreignCountryId?: number;
    specialtyId?: number;
    superCategoryId?: number;
    page?: number;
    append?: boolean;
  }) => Promise<void>;
}

export const useDoctors = (
  initialQuery?: string,
  autoLoad: boolean = true
): UseDoctorsResult => {
  const { authState } = useAuthContext();
  const { userAssistant } = useAppContext();
  const { profile: doctorProfile } = useDoctorProfile();
  const { currentPatient } = usePatientContext();

  // Get user's country based on userAssistant mode and respective profile
  const getUserCountryId = useCallback((): number | null => {
    if (userAssistant === 'medidoc') {
      // Doctor mode: Use country_id from doctor profile
      return doctorProfile?.country_id || null;
    } else if (userAssistant === 'mediaid') {
      // Patient mode: Use country_id from patient profile
      return currentPatient?.country_id || null;
    }
    return null;
  }, [userAssistant, doctorProfile, currentPatient]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [hasMore, setHasMore] = useState(false);
  const [includeForeignDoctors, setIncludeForeignDoctors] = useState(false);

  const loadDoctors = async (
    pageNum: number = 1,
    query?: string,
    append: boolean = false,
    foreignDoctors?: boolean
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await searchDoctors({
        query: query?.trim() || undefined,
        page: pageNum,
        pageSize: 20,
        includeForeignDoctors:
          foreignDoctors !== undefined ? foreignDoctors : includeForeignDoctors,
        userCountryId: getUserCountryId() ?? undefined,
      });

      // Transform the API response to match our Doctor interface
      const transformedDoctors: Doctor[] = result.doctors.map(doctor => {
        const displayName =
          doctor.name ||
          `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() ||
          'Unknown Doctor';

        return {
          id: doctor.id,
          name: displayName,
          email: doctor.email || '',
          role: 'doctor', // All results are doctors
          display_name: displayName,
          full_name: displayName,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          // Use real data from materialized views
          specialty: doctor.specialty_name || 'Unknown Specialty',
          specialty_id: doctor.specialty_id,
          rating: doctor.rating ?? undefined, // Use real rating from database
          reviewCount: doctor.review_count || 0,
          distance: '1-3 mi', // This should be calculated based on location
          languages: ['English'], // This should come from database
          badges: doctor.in_network
            ? ['In-Network', 'Verified Doctor']
            : ['Out-of-Network', 'Contact Directly'],
          avatar: doctor.avatar || undefined, // Use real avatar from database
          user_id: doctor.user_id || undefined,
          inNetwork: doctor.in_network,
          phone: undefined, // This should come from database
          address: undefined, // This should come from database
          country_name: doctor.country_name,
          country_id: doctor.country_id,
          is_same_country: doctor.is_same_country,
        };
      });

      if (append) {
        setDoctors(prev => [...prev, ...transformedDoctors]);
      } else {
        setDoctors(transformedDoctors);
      }

      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setHasMore(result.page < result.totalPages);

      logger.info('Doctors loaded successfully', {
        component: 'useDoctors',
        count: transformedDoctors.length,
        total: result.total,
        page: result.page,
        query: query || 'all',
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load doctors';
      setError(errorMessage);
      logger.error('Failed to load doctors', err as Error, {
        component: 'useDoctors',
        page: pageNum,
        query: query || 'all',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;
    await loadDoctors(nextPage, searchQuery, true, includeForeignDoctors);
  };

  const refresh = async () => {
    await loadDoctors(1, searchQuery, false, includeForeignDoctors);
  };

  // Load doctors when search query or foreign doctors filter changes (only if autoLoad is true)
  useEffect(() => {
    if (!autoLoad) return; // Skip if autoLoad is disabled

    const delayedSearch = setTimeout(() => {
      loadDoctors(1, searchQuery, false, includeForeignDoctors);
    }, 300); // Debounce search

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, includeForeignDoctors, autoLoad]);

  // Initial load (only if autoLoad is true)
  useEffect(() => {
    if (autoLoad) {
      loadDoctors(1, initialQuery, false);
    }
  }, [autoLoad]); // Only run once on mount

  const searchDoctorsWithParams = async (params: {
    query?: string;
    includeOutOfNetwork?: boolean;
    foreignCountryId?: number;
    specialtyId?: number;
    superCategoryId?: number;
    page?: number;
    append?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const result = await searchDoctors({
        query: params.query?.trim() || undefined,
        page: params.page || 1,
        pageSize: 20,
        includeOutOfNetwork: params.includeOutOfNetwork,
        foreignCountryId: params.foreignCountryId,
        specialtyId: params.specialtyId,
        superCategoryId: params.superCategoryId,
        userCountryId: getUserCountryId() ?? undefined,
      });

      // Transform the API response to match our Doctor interface
      const transformedDoctors: Doctor[] = result.doctors.map(doctor => {
        const displayName =
          doctor.name ||
          `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() ||
          'Unknown Doctor';

        return {
          id: doctor.id,
          name: displayName,
          email: doctor.email || '',
          role: 'doctor',
          display_name: displayName,
          full_name: displayName,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          specialty: doctor.specialty_name || 'Unknown Specialty',
          specialty_id: doctor.specialty_id,
          rating: doctor.rating ?? undefined, // Use real rating from database
          reviewCount: doctor.review_count || 0,
          distance: '1-3 mi',
          languages: ['English'],
          badges: doctor.in_network
            ? ['In-Network', 'Verified Doctor']
            : ['Out-of-Network', 'Contact Directly'],
          avatar: doctor.avatar || undefined, // Use real avatar from database
          user_id: doctor.user_id || undefined,
          inNetwork: doctor.in_network,
          phone: undefined,
          address: undefined,
          country_name: doctor.country_name,
          country_id: doctor.country_id,
          is_same_country: doctor.is_same_country,
        };
      });

      if (params.append) {
        setDoctors(prev => [...prev, ...transformedDoctors]);
      } else {
        setDoctors(transformedDoctors);
      }

      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setHasMore(result.page < result.totalPages);

      logger.info('Doctors loaded successfully with params', {
        component: 'useDoctors',
        count: transformedDoctors.length,
        total: result.total,
        page: result.page,
        params,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load doctors';
      setError(errorMessage);
      logger.error('Failed to load doctors with params', err as Error, {
        component: 'useDoctors',
        params,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    doctors,
    loading,
    error,
    total,
    page,
    totalPages,
    searchQuery,
    setSearchQuery,
    loadMore,
    refresh,
    hasMore,
    includeForeignDoctors,
    setIncludeForeignDoctors,
    searchDoctorsWithParams,
  };
};
