import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDoctorProfile } from './useDoctorProfile';
import { usePatientContext } from '../patient/internal/usePatientContext';
import { useDoctorData } from './useDoctorData';
import { useDoctorSearch } from './useDoctorSearch';
import { Doctor, UseDoctorDiscoveryResult } from './types';

export function useDoctorDiscovery(): UseDoctorDiscoveryResult {
  const router = useRouter();
  const { userAssistant } = useAppContext();
  const { authState } = useAuthContext();
  const { profile: doctorProfile } = useDoctorProfile();
  const { currentPatient } = usePatientContext();

  // Get user's country based on userAssistant mode and respective profile
  const getUserCountryId = useCallback((): number | null => {
    console.log('🔍 getUserCountryId called:', {
      userAssistant,
      doctorProfile: doctorProfile?.country_id,
      currentPatient: currentPatient?.country_id,
    });

    if (userAssistant === 'medidoc') {
      // Doctor mode: Use country_id from doctor profile (doctors_view)
      if (doctorProfile?.country_id) {
        console.log('✅ Found doctor country_id:', doctorProfile.country_id);
        return doctorProfile.country_id;
      } else {
        console.log(
          '❌ Doctor profile country_id not available:',
          doctorProfile
        );
      }
    } else if (userAssistant === 'mediaid') {
      // Patient mode: Use country_id from patient profile (patients_view)
      if (currentPatient?.country_id) {
        console.log('✅ Found patient country_id:', currentPatient.country_id);
        return currentPatient.country_id;
      } else {
        console.log(
          '❌ Patient profile country_id not available:',
          currentPatient
        );
      }
    }

    console.log('❌ No country available yet');
    return null;
  }, [userAssistant, doctorProfile, currentPatient]);

  // Get user's country name based on userAssistant mode and respective profile
  const getUserCountryName = useCallback((): string | null => {
    if (userAssistant === 'medidoc') {
      // Doctor mode: Use country_name from doctor profile (doctors_view)
      return doctorProfile?.country_name || null;
    } else if (userAssistant === 'mediaid') {
      // Patient mode: Use country_name from patient profile (patients_view)
      return currentPatient?.country_name || null;
    }
    return null;
  }, [userAssistant, doctorProfile, currentPatient]);

  // Use separated hooks
  const {
    selectedCategoryId,
    superCategories,
    loadingCategories,
    specialties,
    specialtiesLoading,
    selectedSpecialty,
    error: dataError,
    handleCategorySelect: dataHandleCategorySelect,
    handleSpecialtySelect,
    clearError: clearDataError,
  } = useDoctorData();

  const {
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
    error: searchError,
    handleDoctorNameChange,
    handleSearch,
    handleInternationalSearch,
    handleCountrySelect,
    toggleOutOfNetwork,
    loadMoreInNetwork,
    loadMoreOutOfNetwork,
    clearError: clearSearchError,
    retryLastOperation,
    performSearchWithCategory,
  } = useDoctorSearch({
    selectedSpecialty,
    selectedCategoryId,
    getUserCountryId,
  });

  // UI State
  const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);

  // Retry search when profile loads (fixes race condition)
  useEffect(() => {
    const userCountryId = getUserCountryId();

    // If we have a selected category, no current results, and now have a country
    if (
      selectedCategoryId &&
      userCountryId &&
      inNetworkDoctors.length === 0 &&
      outOfNetworkDoctors.length === 0 &&
      !searching
    ) {
      console.log('🔄 Profile loaded with country, retrying category search:', {
        categoryId: selectedCategoryId,
        userCountryId,
      });
      performSearchWithCategory(selectedCategoryId);
    }
  }, [
    doctorProfile?.country_id,
    currentPatient?.country_id,
    selectedCategoryId,
    // Dependencies from original effect
    // getUserCountryId is stable or changes with profile
    // inNetworkDoctors.length etc are needed to check condition
  ]);

  // Action handlers
  const handleCategorySelect = useCallback(
    (categoryId: number) => {
      const newCategoryId =
        categoryId === selectedCategoryId ? null : categoryId;

      // Update data state (toggles category and clears specialty)
      dataHandleCategorySelect(categoryId);

      // Auto-trigger search when category is selected (allows category-only search per BRD)
      if (newCategoryId) {
        console.log('🎯 Auto-triggering search for category:', newCategoryId);

        // Check if user country is available before searching
        const userCountryId = getUserCountryId();
        if (userCountryId) {
          console.log(
            '🎯 User country available, performing search immediately:',
            userCountryId
          );
          performSearchWithCategory(newCategoryId);
        } else {
          console.log(
            '⏳ User country not available yet, will retry when profile loads'
          );
          // The search will be triggered by the effect above when profile loads
        }
      }
    },
    [
      selectedCategoryId,
      dataHandleCategorySelect,
      getUserCountryId,
      performSearchWithCategory,
    ]
  );

  const handleDoctorSelect = useCallback(
    (doctor: Doctor) => {
      if (doctor.in_network) {
        // For now, just show expanded view - conversation creation will be handled by a button in the expanded view
        setExpandedDoctorId(
          expandedDoctorId === doctor.id.toString()
            ? null
            : doctor.id.toString()
        );
      } else {
        // Toggle expansion to show contact info
        setExpandedDoctorId(
          expandedDoctorId === doctor.id.toString()
            ? null
            : doctor.id.toString()
        );
      }
    },
    [expandedDoctorId]
  );

  const clearError = useCallback(() => {
    clearDataError();
    clearSearchError();
  }, [clearDataError, clearSearchError]);

  return {
    // Category State
    selectedCategoryId,
    superCategories,
    loadingCategories,

    // Search State
    selectedSpecialty,
    doctorName,
    specialties,
    specialtiesLoading,

    // International Search State
    selectedCountry,
    countries,
    countriesLoading,

    // Results State
    inNetworkDoctors,
    outOfNetworkDoctors,
    showOutOfNetwork,
    hasMoreInNetwork,
    hasMoreOutOfNetwork,

    // Loading States
    searching,
    loadingOutOfNetwork,

    // Error States
    error: dataError || searchError,

    // UI State
    expandedDoctorId,

    // User Context
    userCountryName: getUserCountryName(),

    // Actions
    handleCategorySelect,
    handleSpecialtySelect,
    handleDoctorNameChange,
    handleSearch,
    handleInternationalSearch,
    handleCountrySelect,
    toggleOutOfNetwork,
    handleDoctorSelect,
    loadMoreInNetwork,
    loadMoreOutOfNetwork,
    clearError,
    retryLastOperation,
  };
}
