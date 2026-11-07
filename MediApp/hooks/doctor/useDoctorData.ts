import { useState, useCallback, useEffect } from 'react';
import {
  getSpecialtySuperCategories,
  getSpecialtiesFiltered,
} from '@/services';
import { ErrorState, SuperCategory, Specialty } from './types';

export function useDoctorData() {
  // Category State
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [superCategories, setSuperCategories] = useState<SuperCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Specialty State
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(
    null
  );

  // Error State
  const [error, setError] = useState<ErrorState | null>(null);

  // Track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState({
    categories: false,
    specialties: false,
  });

  // Load super categories
  const loadSuperCategories = useCallback(async () => {
    setLoadingCategories(true);
    setError(null);
    console.log('🔍 Starting to load super categories...');
    try {
      const response = await getSpecialtySuperCategories();
      console.log('✅ Super categories loaded successfully:', response);
      setSuperCategories(response.super_categories);
    } catch (err) {
      console.error('❌ Failed to load super categories:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError({
        type: 'NETWORK',
        message: `Failed to load categories: ${errorMessage}`,
        retryable: true,
        timestamp: new Date(),
        context: 'loadSuperCategories',
      });
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Load specialties filtered by super category
  const loadSpecialtiesForCategory = useCallback(
    async (superCategoryId?: number) => {
      // Prevent concurrent requests
      if (specialtiesLoading) {
        console.log(
          '🚫 Specialties already loading, skipping duplicate request'
        );
        return;
      }

      setSpecialtiesLoading(true);
      setError(null);
      console.log('🔍 Starting to load specialties...', { superCategoryId });

      try {
        const response = await getSpecialtiesFiltered(superCategoryId);
        console.log('✅ Specialties loaded successfully:', response);
        setSpecialties(response.specialties);

        // Clear selected specialty if it's not in the new filtered list
        if (selectedSpecialty && superCategoryId) {
          const specialtyExists = response.specialties.some(
            s => s.id === selectedSpecialty.id
          );
          if (!specialtyExists) {
            setSelectedSpecialty(null);
          }
        }
      } catch (err) {
        console.error('❌ Failed to load specialties:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError({
          type: 'NETWORK',
          message: `Failed to load specialties: ${errorMessage}`,
          retryable: true,
          timestamp: new Date(),
          context: 'loadSpecialtiesForCategory',
        });
      } finally {
        setSpecialtiesLoading(false);
      }
    },
    [selectedSpecialty, specialtiesLoading]
  );

  // Load initial data only once
  useEffect(() => {
    const loadInitialData = async () => {
      // Load categories
      if (
        superCategories.length === 0 &&
        !loadingCategories &&
        !initialDataLoaded.categories
      ) {
        setInitialDataLoaded(prev => ({ ...prev, categories: true }));
        loadSuperCategories();
      }

      // Load specialties
      if (
        specialties.length === 0 &&
        !specialtiesLoading &&
        !initialDataLoaded.specialties
      ) {
        setInitialDataLoaded(prev => ({ ...prev, specialties: true }));
        loadSpecialtiesForCategory(); // Load all specialties initially
      }
    };

    loadInitialData();
  }, []);

  // Category filtering effect - only trigger after initial load is complete
  useEffect(() => {
    // Only trigger if initial specialties have been loaded
    if (!initialDataLoaded.specialties) return;

    if (selectedCategoryId) {
      loadSpecialtiesForCategory(selectedCategoryId);
    } else {
      // Only reload all specialties if we don't already have them
      if (specialties.length === 0) {
        loadSpecialtiesForCategory();
      }
    }
  }, [selectedCategoryId, initialDataLoaded.specialties]);

  const handleCategorySelect = useCallback(
    (categoryId: number) => {
      const newCategoryId =
        categoryId === selectedCategoryId ? null : categoryId;
      setSelectedCategoryId(newCategoryId);

      // Clear specialty selection when category changes
      if (newCategoryId !== selectedCategoryId) {
        setSelectedSpecialty(null);
      }
    },
    [selectedCategoryId]
  );

  const handleSpecialtySelect = useCallback((specialty: Specialty | null) => {
    setSelectedSpecialty(specialty);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    selectedCategoryId,
    superCategories,
    loadingCategories,
    specialties,
    specialtiesLoading,
    selectedSpecialty,
    error,

    // Actions
    handleCategorySelect,
    handleSpecialtySelect,
    clearError,
    setError,
  };
}
