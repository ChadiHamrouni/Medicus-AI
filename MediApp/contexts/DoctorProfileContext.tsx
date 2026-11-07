/**
 * Doctor Profile Store
 * Manages doctor profile state globally with server-side sync using Zustand
 * Uses cached auth data as primary source, fetches from server only when needed
 */

import { create } from 'zustand';
import { getDoctorProfile } from '@/services';
import { DoctorProfileResponse } from '@/types';
import { logger } from '@/utils';

interface DoctorProfileState {
  // Profile data
  profile: DoctorProfileResponse | null;
  isLoading: boolean;
  error: string | null;

  // State flags
  hasInitialized: boolean;
  lastSyncTime: Date | null;
  lastUpdateTime: Date | null; // Track when we last made an update

  // Background sync timer reference
  backgroundSyncTimer: ReturnType<typeof setTimeout> | null;
}

interface DoctorProfileActions {
  // Actions
  refreshProfile: (_forceUpdate?: boolean, _staleTime?: number) => Promise<void>;
  updateLocalProfile: (_updates: Partial<DoctorProfileResponse>) => void;
  clearError: () => void;

  // Background sync
  scheduleBackgroundSync: (_delayMs?: number) => void;

  // Manual persistence
  saveCurrentState: () => void;

  // Initialization
  initializeFromAuth: (_authProfile: DoctorProfileResponse) => void;
  clearProfile: () => void;
}

type DoctorProfileStore = DoctorProfileState & DoctorProfileActions;

// Zustand store for doctor profile management
export const useDoctorProfileStore = create<DoctorProfileStore>((set, get) => ({
  // Initial state
  profile: null,
  isLoading: false,
  error: null,
  hasInitialized: false,
  lastSyncTime: null,
  lastUpdateTime: null,
  backgroundSyncTimer: null,

  // Initialize profile data from auth context
  initializeFromAuth: (authProfile: DoctorProfileResponse) => {
    const state = get();

    // Check if we have any pending local updates that are newer than auth data
    const authProfileUpdated = authProfile.updated_at
      ? new Date(authProfile.updated_at)
      : new Date(0); // Default to very old date if no timestamp

    const shouldUseAuthData =
      !state.lastUpdateTime || authProfileUpdated > state.lastUpdateTime;

    if (shouldUseAuthData) {
      logger.info('Initializing doctor profile from auth cache', {
        component: 'DoctorProfileStore',
        profileId: authProfile.id,
        hasProfileData: !!authProfile,
        usingAuthData: shouldUseAuthData,
      });

      set({
        profile: authProfile,
        lastSyncTime: new Date(),
        hasInitialized: true,
        error: null,
      });

      if (!authProfile.medical_procedures) {
        logger.info('Auth profile is incomplete, triggering full profile refresh', {
          component: 'DoctorProfileStore',
          profileId: authProfile.id,
        });
        get().refreshProfile(true);
      }
    } else {
      logger.info('Keeping existing profile data (newer than auth cache)', {
        component: 'DoctorProfileStore',
        lastUpdateTime: state.lastUpdateTime?.toISOString(),
        authUpdatedAt: authProfileUpdated.toISOString(),
      });

      // Still mark as initialized
      set({ hasInitialized: true });
    }
  },

  // Clear profile data when user logs out
  clearProfile: () => {
    const state = get();
    if (state.backgroundSyncTimer) {
      clearTimeout(state.backgroundSyncTimer);
    }

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

  refreshProfile: async (
    forceUpdate: boolean = false,
    staleTime: number = 0
  ) => {
    const state = get();

    // Check for stale time if not forcing update
    if (!forceUpdate && staleTime > 0 && state.lastSyncTime) {
      const timeSinceLastSync =
        new Date().getTime() - state.lastSyncTime.getTime();
      if (timeSinceLastSync < staleTime) {
        logger.info('Skipping profile refresh - data is fresh', {
          component: 'DoctorProfileStore',
          timeSinceLastSync,
          staleTime,
        });
        return;
      }
    }

    // Prevent concurrent fetches unless forcing an update
    if (state.isLoading && !forceUpdate) {
      logger.info('Skipping profile refresh - already loading', {
        component: 'DoctorProfileStore',
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      logger.info('Refreshing doctor profile from server', {
        component: 'DoctorProfileStore',
        currentProfileId: state.profile?.id,
        forceUpdate,
        staleTime,
        hasRecentLocalUpdates: !!state.lastUpdateTime,
      });

      const freshProfile = await getDoctorProfile();

      // Check if we should update based on timestamps
      const serverUpdated = freshProfile.updated_at
        ? new Date(freshProfile.updated_at)
        : new Date(0);

      const shouldUpdate =
        forceUpdate ||
        !state.lastUpdateTime ||
        serverUpdated > state.lastUpdateTime;

      if (shouldUpdate) {
        set({
          profile: freshProfile,
          lastSyncTime: new Date(),
          hasInitialized: true,
          isLoading: false,
        });

        logger.info('Doctor profile refreshed and updated', {
          component: 'DoctorProfileStore',
          profileId: freshProfile.id,
          profileCompletionPercentage:
            freshProfile.profile_completion_percentage,
          serverUpdated: serverUpdated.toISOString(),
          lastLocalUpdate: state.lastUpdateTime?.toISOString(),
        });
      } else {
        logger.info('Skipping profile update - local changes are newer', {
          component: 'DoctorProfileStore',
          serverUpdated: serverUpdated.toISOString(),
          lastLocalUpdate: state.lastUpdateTime?.toISOString(),
        });

        // Still update sync time to show we checked
        set({ lastSyncTime: new Date(), isLoading: false });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh profile';
      set({ error: errorMessage, isLoading: false });

      logger.error('Failed to refresh doctor profile', err as Error, {
        component: 'DoctorProfileStore',
        currentProfileId: state.profile?.id,
      });
    }
  },

  // Schedule a background refresh to sync with server after API propagation delay
  scheduleBackgroundSync: (delayMs: number = 30000) => {
    const state = get();

    // Clear any existing timer
    if (state.backgroundSyncTimer) {
      clearTimeout(state.backgroundSyncTimer);
    }

    // Schedule new background sync
    const timer = setTimeout(async () => {
      logger.info('Running scheduled background sync', {
        component: 'DoctorProfileStore',
        delayMs,
      });

      const currentState = get();
      // Only refresh if we have a profile
      if (currentState.profile) {
        try {
          // For background sync, we want to force update since enough time has passed
          await get().refreshProfile(true);
        } catch (error) {
          logger.warn('Background sync failed', {
            component: 'DoctorProfileStore',
            error: error as Error,
          });
        }
      }
    }, delayMs);

    set({ backgroundSyncTimer: timer });
  },

  // Update local profile state optimistically
  updateLocalProfile: (updates: Partial<DoctorProfileResponse>) => {
    const state = get();

    if (!state.profile) {
      logger.warn('Cannot update profile - no profile data available', {
        component: 'DoctorProfileStore',
      });
      return;
    }

    logger.info('Updating local profile state', {
      component: 'DoctorProfileStore',
      updateKeys: Object.keys(updates),
      profileId: state.profile.id,
    });

    set({
      profile: {
        ...state.profile,
        ...updates,
      },
      lastUpdateTime: new Date(),
    });

    // Schedule a background sync for later (when API data should be fresh)
    get().scheduleBackgroundSync(30000); // 30 seconds delay
  },

  // Clear any error state
  clearError: () => {
    set({ error: null });
  },

  // Save current state as the "source of truth"
  saveCurrentState: () => {
    const state = get();

    if (state.profile) {
      // Reset the last update time since this state is now "saved"
      set({
        lastUpdateTime: null,
        lastSyncTime: new Date(),
      });

      logger.info('Current profile state saved as baseline', {
        component: 'DoctorProfileStore',
        profileId: state.profile.id,
      });
    }
  },
}));

// Export the hook with the same name for compatibility
export const useDoctorProfileContext = useDoctorProfileStore;

// Default export for backward compatibility
export default useDoctorProfileStore;
