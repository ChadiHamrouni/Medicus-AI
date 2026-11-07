/**
 * Hook to sync patient store with auth context and initialize from storage
 */

import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePatientStore } from '@/contexts/PatientStore';

export function usePatientSync() {
  const { authState } = useAuthContext();
  const {
    initializeFromAuth,
    initializeFromStorage,
    clearPatients,
    hasInitialized,
  } = usePatientStore();

  // Initialize from AsyncStorage on mount
  useEffect(() => {
    if (!hasInitialized) {
      initializeFromStorage();
    }
  }, [hasInitialized, initializeFromStorage]);

  // Initialize from auth context if available
  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.role === 'patient') {
      // If auth provides any patient-related data, initialize from it
      initializeFromAuth(authState.user);
    }
  }, [authState.isAuthenticated, authState.user, initializeFromAuth]);

  // Clear patients data when user logs out or switches to doctor role
  useEffect(() => {
    if (!authState.isAuthenticated || authState.user?.role !== 'patient') {
      clearPatients();
    }
  }, [authState.isAuthenticated, authState.user?.role, clearPatients]);
}
