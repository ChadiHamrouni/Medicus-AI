import { useState, useCallback } from 'react';
import { searchDoctors, searchOONDoctors } from '@/services';
import { ErrorState, Doctor, Specialty, Country } from './types';

interface UseDoctorSearchProps {
  selectedSpecialty: Specialty | null;
  selectedCategoryId: number | null;
  getUserCountryId: () => number | null;
}

export function useDoctorSearch({
  selectedSpecialty,
  selectedCategoryId,
  getUserCountryId,
}: UseDoctorSearchProps) {
  // Search State
  const [doctorName, setDoctorName] = useState('');

  // International Search State
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  // Results State
  const [inNetworkDoctors, setInNetworkDoctors] = useState<Doctor[]>([]);
  const [outOfNetworkDoctors, setOutOfNetworkDoctors] = useState<Doctor[]>([]);
  const [showOutOfNetwork, setShowOutOfNetwork] = useState(false);
  const [hasMoreInNetwork, setHasMoreInNetwork] = useState(false);
  const [hasMoreOutOfNetwork, setHasMoreOutOfNetwork] = useState(false);
  const [oonFetched, setOonFetched] = useState(false); // Track if OON doctors were already fetched

  // Loading States
  const [searching, setSearching] = useState(false);
  const [loadingOutOfNetwork, setLoadingOutOfNetwork] = useState(false);

  // Error State
  const [error, setError] = useState<ErrorState | null>(null);
  const [lastOperation, setLastOperation] = useState<
    (() => Promise<void>) | null
  >(null);

  // Main search function - implements BRD logic
  const performSearch = useCallback(
    async (isInternational = false, append = false) => {
      console.log('🔍 performSearch called:', {
        isInternational,
        append,
        selectedSpecialty: selectedSpecialty?.name,
        selectedSpecialtyId: selectedSpecialty?.id,
        doctorName: doctorName.trim(),
        selectedCategoryId,
      });

      // Local Search Logic - Updated to allow category-only search
      if (!selectedSpecialty && !doctorName.trim() && !selectedCategoryId) {
        console.log('🚫 No search criteria provided');
        // No input at all - show nothing
        if (!append) {
          setInNetworkDoctors([]);
          setOutOfNetworkDoctors([]);
        }
        return;
      }

      const operation = async () => {
        if (!append) {
          setSearching(true);
          setInNetworkDoctors([]);
          setOutOfNetworkDoctors([]);
          setOonFetched(false); // Reset OON cache for new search
          setShowOutOfNetwork(false); // Collapse OON section on new search
        }

        setError(null);

        try {
          const searchParams: any = {
            page: append
              ? Math.floor(
                  (inNetworkDoctors.length + outOfNetworkDoctors.length) / 20
                ) + 1
              : 1,
            pageSize: 20,
            includeOutOfNetwork: true,
          };

          // Add search parameters based on BRD logic
          if (selectedSpecialty) {
            searchParams.specialtyId = selectedSpecialty.id;
            console.log('🎯 Adding specialty filter:', {
              specialtyId: selectedSpecialty.id,
              specialtyName: selectedSpecialty.name,
            });
          }

          if (doctorName.trim()) {
            searchParams.query = doctorName.trim();
            console.log('🎯 Adding doctor name filter:', doctorName.trim());
          }

          // Apply category filter if selected
          if (selectedCategoryId) {
            searchParams.superCategoryId = selectedCategoryId;
            console.log('🎯 Adding category filter:', selectedCategoryId);
          }

          // Set country for search - Use user's country from respective view
          const userCountryId = getUserCountryId();
          if (userCountryId) {
            searchParams.userCountryId = userCountryId;
            console.log('🎯 Adding user country filter:', userCountryId);
          } else {
            console.log(
              '🎯 No user country available - searching all countries'
            );
          }

          console.log('📡 Making API call with search params:', searchParams);
          const response = await searchDoctors(searchParams);
          console.log('✅ Search response received:', response);

          // Separate in-network and out-of-network doctors
          const allDoctors = response.doctors || [];
          // Transform doctors to match local Doctor interface (convert null rating to undefined)
          const transformedDoctors = allDoctors.map((doctor: any) => ({
            ...doctor,
            rating: doctor.rating === null ? undefined : doctor.rating,
          }));
          const inNetwork = transformedDoctors.filter(
            (d: Doctor) => d.in_network
          );
          const outNetwork = transformedDoctors.filter(
            (d: Doctor) => !d.in_network
          );

          if (append) {
            setInNetworkDoctors(prev => [...prev, ...inNetwork]);
            setOutOfNetworkDoctors(prev => [...prev, ...outNetwork]);
          } else {
            setInNetworkDoctors(inNetwork);
            setOutOfNetworkDoctors(outNetwork);
          }

          setHasMoreInNetwork(response.page < response.totalPages);
          setHasMoreOutOfNetwork(response.page < response.totalPages);
        } catch (err) {
          console.error('❌ Search failed with error:', err);
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
          console.error('❌ Error details:', {
            message: errorMessage,
            type: typeof err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          setError({
            type: 'NETWORK',
            message: `Failed to search doctors: ${errorMessage}`,
            retryable: true,
            timestamp: new Date(),
            context: 'performSearch',
          });
        } finally {
          setSearching(false);
        }
      };

      setLastOperation(() => operation);
      await operation();
    },
    [
      selectedSpecialty,
      doctorName,
      selectedCategoryId,
      getUserCountryId,
      inNetworkDoctors.length,
      outOfNetworkDoctors.length,
    ]
  );

  // Immediate search with specific category (fixes timing issue)
  const performSearchWithCategory = useCallback(
    async (categoryId: number) => {
      console.log('🔍 performSearchWithCategory called with:', categoryId);

      setSearching(true);
      setInNetworkDoctors([]);
      setOutOfNetworkDoctors([]);
      setOonFetched(false); // Reset OON cache for new search
      setShowOutOfNetwork(false); // Collapse OON section on new search
      setError(null);

      try {
        const searchParams: any = {
          page: 1,
          pageSize: 20,
          includeOutOfNetwork: true,
          superCategoryId: categoryId,
        };

        // Add doctor name filter if present
        if (doctorName.trim()) {
          searchParams.query = doctorName.trim();
          console.log('🎯 Adding doctor name filter:', doctorName.trim());
        }

        // Set country for search - Use user's country from respective view
        const userCountryId = getUserCountryId();
        if (userCountryId) {
          searchParams.userCountryId = userCountryId;
          console.log('🎯 Adding user country filter:', userCountryId);
        } else {
          console.log('🎯 No user country available - searching all countries');
        }

        console.log(
          '📡 Making immediate API call with search params:',
          searchParams
        );
        const response = await searchDoctors(searchParams);
        console.log('✅ Immediate search response received:', response);

        // Separate in-network and out-of-network doctors
        const allDoctors = response.doctors || [];
        // Transform doctors to match local Doctor interface (convert null rating to undefined)
        const transformedDoctors = allDoctors.map((doctor: any) => ({
          ...doctor,
          rating: doctor.rating === null ? undefined : doctor.rating,
        }));
        const inNetwork = transformedDoctors.filter(
          (d: Doctor) => d.in_network
        );
        const outNetwork = transformedDoctors.filter(
          (d: Doctor) => !d.in_network
        );

        setInNetworkDoctors(inNetwork);
        setOutOfNetworkDoctors(outNetwork);
        setHasMoreInNetwork(response.page < response.totalPages);
        setHasMoreOutOfNetwork(response.page < response.totalPages);
      } catch (err) {
        console.error('❌ Immediate search failed with error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError({
          type: 'NETWORK',
          message: `Failed to search doctors: ${errorMessage}`,
          retryable: true,
          timestamp: new Date(),
          context: 'performSearchWithCategory',
        });
      } finally {
        setSearching(false);
      }
    },
    [doctorName, getUserCountryId]
  );

  const handleDoctorNameChange = useCallback((name: string) => {
    setDoctorName(name);
  }, []);

  const handleSearch = useCallback(() => {
    performSearch(false, false);
  }, [performSearch]);

  const handleInternationalSearch = useCallback(() => {
    performSearch(true, false);
  }, [performSearch]);

  const handleCountrySelect = useCallback((country: Country | null) => {
    setSelectedCountry(country);
  }, []);

  const toggleOutOfNetwork = useCallback(async () => {
    const newShowState = !showOutOfNetwork;
    setShowOutOfNetwork(newShowState);

    // If toggling ON and we haven't fetched OON doctors yet, fetch them
    // Results are cached until a new search is performed
    if (newShowState && !oonFetched) {
      setLoadingOutOfNetwork(true);
      setError(null);

      try {
        const searchParams: any = {
          page: 1,
          pageSize: 20,
        };

        // Add specialty ID if selected
        if (selectedSpecialty) {
          searchParams.specialtyId = selectedSpecialty.id;
        }

        // Add category filter if selected
        if (selectedCategoryId) {
          searchParams.superCategoryId = selectedCategoryId;
        }

        // Add user's country for filtering
        const userCountryId = getUserCountryId();
        if (userCountryId) {
          searchParams.userCountryId = userCountryId;
        }

        // Add doctor name filter if present
        if (doctorName.trim()) {
          searchParams.query = doctorName.trim();
        }

        console.log('📡 Fetching OON doctors with params:', searchParams);
        const response = await searchOONDoctors(searchParams);
        console.log('✅ OON doctors response:', response);

        // Transform doctors to match local Doctor interface
        const transformedDoctors = response.doctors.map((doctor: any) => ({
          ...doctor,
          in_network: false,
          rating: undefined,
        }));

        setOutOfNetworkDoctors(transformedDoctors);
        setHasMoreOutOfNetwork(response.page < response.totalPages);
        setOonFetched(true); // Mark as fetched to cache results
      } catch (err) {
        console.error('❌ Failed to fetch OON doctors:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError({
          type: 'NETWORK',
          message: `Failed to fetch out-of-network doctors: ${errorMessage}`,
          retryable: true,
          timestamp: new Date(),
          context: 'toggleOutOfNetwork',
        });
      } finally {
        setLoadingOutOfNetwork(false);
      }
    }
  }, [
    showOutOfNetwork,
    oonFetched,
    selectedSpecialty,
    selectedCategoryId,
    doctorName,
    getUserCountryId,
  ]);

  const loadMoreInNetwork = useCallback(() => {
    if (hasMoreInNetwork && !searching) {
      performSearch(false, true);
    }
  }, [hasMoreInNetwork, searching, performSearch]);

  const loadMoreOutOfNetwork = useCallback(() => {
    if (hasMoreOutOfNetwork && !loadingOutOfNetwork) {
      setLoadingOutOfNetwork(true);
      performSearch(false, true).finally(() => setLoadingOutOfNetwork(false));
    }
  }, [hasMoreOutOfNetwork, loadingOutOfNetwork, performSearch]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retryLastOperation = useCallback(async () => {
    if (lastOperation) {
      await lastOperation();
    }
  }, [lastOperation]);

  return {
    // State
    doctorName,
    selectedCountry,
    countries,
    countriesLoading,
    inNetworkDoctors,
    outOfNetworkDoctors,
    showOutOfNetwork,
    hasMoreInNetwork,
    hasMoreOutOfNetwork,
    searching,
    loadingOutOfNetwork,
    error,

    // Actions
    handleDoctorNameChange,
    handleSearch,
    handleInternationalSearch,
    handleCountrySelect,
    toggleOutOfNetwork,
    loadMoreInNetwork,
    loadMoreOutOfNetwork,
    clearError,
    retryLastOperation,
    performSearchWithCategory,
  };
}
