/**
 * Hook to sync doctor profile store with auth context
 * stays in sync with auth state changes
 */

import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDoctorProfileStore } from '@/contexts/DoctorProfileContext';

export function useDoctorProfileSync() {
  const { authState } = useAuthContext();
  const { initializeFromAuth, clearProfile, hasInitialized } =
    useDoctorProfileStore();

  // Initialize profile data from auth context
  useEffect(() => {
    if (authState.doctorProfile && !hasInitialized) {
      initializeFromAuth(authState.doctorProfile);
    }
  }, [authState.doctorProfile, hasInitialized, initializeFromAuth]);

  // Clear profile data when user logs out
  useEffect(() => {
    if (!authState.isAuthenticated || authState.user?.role !== 'doctor') {
      clearProfile();
    }
  }, [authState.isAuthenticated, authState.user?.role, clearProfile]);
}
