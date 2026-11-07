/**
 * Patient Profile Context
 */

import React, { ReactNode, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils';
import type { PatientProfileResponse } from '@/types';
import { usePatientProfileQuery } from '@/hooks/patient/queries';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';

// Zustand store for patient profile state
interface PatientProfileState {
  // Profile data
  profile: PatientProfileResponse | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // State flags
  hasInitialized: boolean;
  lastSyncTime: Date | null;
  lastUpdateTime: Date | null;

  // Background sync timer
  backgroundSyncTimer: ReturnType<typeof setTimeout> | null;
}

interface PatientProfileActions {
  // Profile management
  setProfile: (_profile: PatientProfileResponse | null) => void;
  updateLocalProfile: (_updates: Partial<PatientProfileResponse>) => void;
  clearProfile: () => void;

  // State management
  setLoading: (_loading: boolean) => void;
  setError: (_error: string | null) => void;
  clearError: () => void;

  // Initialization and persistence
  initializeFromAuth: (_authData?: any) => void;
  initializeFromStorage: () => Promise<void>;

  // Background sync
  scheduleBackgroundSync: (_delayMs?: number) => void;
  saveCurrentState: () => void;

  // Computed properties
  getDisplayName: () => string;
  getFullName: () => string;
  isProfileComplete: () => boolean;
}

type PatientProfileStore = PatientProfileState & PatientProfileActions;

const PATIENT_PROFILE_STORAGE_KEY = '@medicus_patient_profile';

export const usePatientProfileStore = create<PatientProfileStore>(
  (set, get) => ({
    // Initial state
    profile: null,
    isLoading: false,
    error: null,
    hasInitialized: false,
    lastSyncTime: null,
    lastUpdateTime: null,
    backgroundSyncTimer: null,

    // Profile management
    setProfile: (profile: PatientProfileResponse | null) => {
      set({
        profile,
        lastSyncTime: new Date(),
        hasInitialized: true,
        error: null,
      });

      // Persist to storage
      if (profile) {
        AsyncStorage.setItem(
          PATIENT_PROFILE_STORAGE_KEY,
          JSON.stringify(profile)
        ).catch(err =>
          logger.warn('Failed to persist patient profile', { error: err })
        );
      } else {
        AsyncStorage.removeItem(PATIENT_PROFILE_STORAGE_KEY).catch(err =>
          logger.warn('Failed to clear persisted patient profile', {
            error: err,
          })
        );
      }
    },

    updateLocalProfile: (updates: Partial<PatientProfileResponse>) => {
      const state = get();
      if (!state.profile) {
        logger.warn('Cannot update profile - no profile loaded');
        return;
      }

      const updatedProfile = { ...state.profile, ...updates };

      set({
        profile: updatedProfile,
        lastUpdateTime: new Date(),
      });

      // Persist updated profile
      AsyncStorage.setItem(
        PATIENT_PROFILE_STORAGE_KEY,
        JSON.stringify(updatedProfile)
      ).catch(err =>
        logger.warn('Failed to persist updated patient profile', { error: err })
      );

      // Schedule background sync
      get().scheduleBackgroundSync(30000); // 30 seconds
    },

    clearProfile: () => {
      const state = get();
      if (state.backgroundSyncTimer) {
        clearTimeout(state.backgroundSyncTimer);
      }

      // Clear persisted data
      AsyncStorage.removeItem(PATIENT_PROFILE_STORAGE_KEY).catch(err =>
        logger.warn('Failed to clear persisted patient profile', { error: err })
      );

      set({
        profile: null,
        isLoading: false,
        error: null,
        hasInitialized: false,
        lastSyncTime: null,
        lastUpdateTime: null,
        backgroundSyncTimer: null,
      });
    },

    // State management
    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    },

    // Initialize from auth context (if any profile data is provided)
    initializeFromAuth: (authData?: any) => {
      logger.info('Initializing patient profile store from auth cache', {
        component: 'PatientProfileStore',
        hasAuthData: !!authData,
      });

      set({
        hasInitialized: true,
        error: null,
      });
    },

    // Initialize from AsyncStorage
    initializeFromStorage: async () => {
      try {
        const persistedProfile = await AsyncStorage.getItem(
          PATIENT_PROFILE_STORAGE_KEY
        );
        if (persistedProfile) {
          const profile: PatientProfileResponse = JSON.parse(persistedProfile);

          logger.info('Initializing patient profile from storage', {
            component: 'PatientProfileStore',
            profileId: profile.id,
            patientName: profile.full_name,
          });

          set({
            profile,
            hasInitialized: true,
            lastSyncTime: new Date(),
          });
        }
      } catch (error) {
        logger.error(
          'Failed to load persisted patient profile',
          error as Error,
          {
            component: 'PatientProfileStore',
          }
        );
      }
    },

    // Background sync
    scheduleBackgroundSync: (delayMs: number = 30000) => {
      const state = get();

      if (state.backgroundSyncTimer) {
        clearTimeout(state.backgroundSyncTimer);
      }

      const timer = setTimeout(() => {
        logger.info('Running scheduled background sync', {
          component: 'PatientProfileStore',
          delayMs,
        });

        // Background sync would be implemented here if needed
        // For now, we rely on React Query's refetch mechanisms
      }, delayMs);

      set({ backgroundSyncTimer: timer });
    },

    saveCurrentState: () => {
      set({
        lastUpdateTime: null,
        lastSyncTime: new Date(),
      });

      logger.info('Current patient profile state saved as baseline', {
        component: 'PatientProfileStore',
        profileId: get().profile?.id,
      });
    },

    // Computed properties
    getDisplayName: () => {
      const profile = get().profile;
      return profile?.display_name || profile?.full_name || 'Patient';
    },

    getFullName: () => {
      const profile = get().profile;
      return (
        profile?.full_name ||
        `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
        'Unknown Patient'
      );
    },

    isProfileComplete: () => {
      const profile = get().profile;
      // Consider profile complete if we have basic required info
      return !!(profile?.first_name && profile?.last_name && profile?.email);
    },
  })
);

// Context interface
interface PatientProfileContextType {
  // State
  profile: PatientProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  hasInitialized: boolean;
  lastSyncTime: Date | null;
  lastUpdateTime: Date | null;

  // Actions
  refreshProfile: (_force?: boolean) => Promise<void>;
  updateLocalProfile: (_updates: Partial<PatientProfileResponse>) => void;
  clearError: () => void;
  clearProfile: () => void;

  // Background sync
  scheduleBackgroundSync: (_delayMs?: number) => void;
  saveCurrentState: () => void;

  // Computed properties
  displayName: string;
  fullName: string;
  isProfileComplete: boolean;
}

interface PatientProfileProviderProps {
  children: ReactNode;
}

/**
 * Hook that combines Zustand store with React Query
 */
function usePatientProfileContextLogic(): PatientProfileContextType {
  const store = usePatientProfileStore();

  // Get user data from auth context
  const { authState } = useAuthContext();
  const { userAssistant } = useAppContext();

  const shouldFetch =
    !store.hasInitialized &&
    authState.isAuthenticated &&
    (authState.user?.role === 'patient' ||
      (authState.user?.role === 'doctor' && userAssistant === 'mediaid'));

  // React Query hook for profile data - only fetch once on initialization
  const {
    data: profileData,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
    isRefetching,
  } = usePatientProfileQuery(shouldFetch, authState.user);

  // Sync React Query data with Zustand store (only once on initial load)
  useEffect(() => {
    if (profileData && !store.profile && !store.hasInitialized) {
      store.setProfile(profileData);
      logger.info('Patient profile initialized from server', {
        component: 'PatientProfileContext',
        profileId: profileData.id,
        strategy: 'single_fetch',
      });
    }
  }, [profileData, store]);

  // Combined loading state
  const isLoading = useMemo(() => {
    return store.isLoading || isQueryLoading || isRefetching;
  }, [store.isLoading, isQueryLoading, isRefetching]);

  // Combined error state
  const error = useMemo(() => {
    return store.error || queryError?.message || null;
  }, [store.error, queryError?.message]);

  // Refresh function - only use when absolutely necessary (e.g., error recovery)
  const refreshProfile = async (force: boolean = false) => {
    try {
      store.setLoading(true);
      store.clearError();

      if (force) {
        logger.warn('Force refreshing patient profile (should be rare)', {
          component: 'PatientProfileContext',
          reason: 'error_recovery_or_explicit_request',
        });
      }

      const { data } = await refetch();
      if (data) {
        store.setProfile(data);
      }
      store.saveCurrentState();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to refresh profile';
      store.setError(errorMessage);

      logger.error('Failed to refresh patient profile', error as Error, {
        component: 'PatientProfileContext',
      });
    } finally {
      store.setLoading(false);
    }
  };

  return {
    // State from store and query
    profile: store.profile || profileData || null,
    isLoading,
    error,
    hasInitialized: store.hasInitialized,
    lastSyncTime: store.lastSyncTime,
    lastUpdateTime: store.lastUpdateTime,

    // Actions
    refreshProfile,
    updateLocalProfile: store.updateLocalProfile,
    clearError: store.clearError,
    clearProfile: store.clearProfile,
    scheduleBackgroundSync: store.scheduleBackgroundSync,
    saveCurrentState: store.saveCurrentState,

    // Computed properties
    displayName: store.getDisplayName(),
    fullName: store.getFullName(),
    isProfileComplete: store.isProfileComplete(),
  };
}

// Simple provider component
export const PatientProfileProvider: React.FC<PatientProfileProviderProps> = ({
  children,
}) => {
  return <>{children}</>;
};

// Export the hook for use throughout the app
export const usePatientProfileContext = usePatientProfileContextLogic;

export default usePatientProfileContextLogic;
