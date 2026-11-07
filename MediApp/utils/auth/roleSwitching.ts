/**
 * Role Switching Utilities
 * Handles the complex logic for switching between doctor and patient modes
 */

import { UserAssistant, UserRole } from '@/contexts/AppContext';
import { logger } from '../infrastructure/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from '../infrastructure';

// Cache keys for role-specific data
const CACHE_KEYS = {
  DOCTOR_CACHE: '@MediApp:doctorCache',
  PATIENT_CACHE: '@MediApp:patientCache',
  CONVERSATION_CACHE: '@MediApp:conversations',
  CURRENT_MODE: '@MediApp:userAssistant',
} as const;

// Backend API endpoints (will be implemented later)
const API_ENDPOINTS = {
  UPDATE_USER_ASSISTANT: '/api/user/update-assistant',
  GET_CONVERSATIONS: '/api/conversations',
} as const;

export interface RoleSwitchOptions {
  targetAssistant: UserAssistant;
  currentUserRole: UserRole;
  userId: string;
  onNavigationChange?: (targetRoute: string) => void;
  onCacheCleared?: () => void;
  onBackendUpdated?: () => void;
}

export interface CachedData {
  timestamp: number;
  data: any;
}

/**
 * Cache Management Functions
 */
export class CacheManager {
  /**
   * Clear doctor-specific cached data
   */
  static async clearDoctorCache(): Promise<void> {
    try {
      const keysToRemove = [
        '@MediApp:doctorProfile',
        '@MediApp:doctorConversations',
        '@MediApp:doctorSettings',
        '@MediApp:doctorDashboard',
        '@MediApp:practiceData',
      ];

      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));

      logger.info('Doctor cache cleared', {
        component: 'CacheManager',
        keysCleared: keysToRemove.length,
      });
    } catch (error) {
      logger.error('Failed to clear doctor cache', error as Error, {
        component: 'CacheManager',
      });
      throw error;
    }
  }

  /**
   * Clear patient-specific cached data
   */
  static async clearPatientCache(): Promise<void> {
    try {
      const keysToRemove = [
        '@MediApp:patientProfile',
        '@MediApp:patientConversations',
        '@MediApp:patientSettings',
        '@MediApp:patientDashboard',
        '@MediApp:dependents',
        '@MediApp:healthRecords',
      ];

      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));

      logger.info('Patient cache cleared', {
        component: 'CacheManager',
        keysCleared: keysToRemove.length,
      });
    } catch (error) {
      logger.error('Failed to clear patient cache', error as Error, {
        component: 'CacheManager',
      });
      throw error;
    }
  }

  /**
   * Load patient context data
   */
  static async loadPatientContext(userId: string): Promise<void> {
    try {
      logger.info('Loading patient context', {
        component: 'CacheManager',
        userId,
      });

      // Fetch the current user's patient profile using the new /patients/me endpoint
      const { env } = await import('@/utils');

      const response = await authenticatedFetch(
        `${env.medicusUserApiBaseUrl}/patients/me`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to load patient data: ${response.status} - ${errorText}`
        );
      }

      const patientData = await response.json();

      // 📊 LOG 1: Raw patient data from API
      logger.info(
        '📊 STEP 1: Raw patient data received from /patients/me API',
        {
          component: 'CacheManager',
          userId,
          patientData: JSON.stringify(patientData, null, 2),
          fields: {
            id: patientData?.id,
            user_id: patientData?.user_id,
            first_name: patientData?.first_name,
            last_name: patientData?.last_name,
            full_name: patientData?.full_name,
            email: patientData?.email,
            phone_number: patientData?.phone_number,
            whatsapp_number: patientData?.whatsapp_number,
            emergency_contact: patientData?.emergency_contact,
            address: patientData?.address,
            country_id: patientData?.country_id,
            dob: patientData?.date_of_birth || patientData?.dob,
            gender: patientData?.gender,
            status: patientData?.status,
          },
        }
      );

      // Cache the patient data for quick access
      const patientCacheKey = '@MediApp:patientProfile';
      const AsyncStorage =
        await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem(
        patientCacheKey,
        JSON.stringify(patientData)
      );

      // 📊 LOG 2: Confirm data cached
      logger.info('📊 STEP 2: Patient data cached to AsyncStorage', {
        component: 'CacheManager',
        cacheKey: patientCacheKey,
        cachedDataPreview:
          JSON.stringify(patientData, null, 2).substring(0, 200) + '...',
      });
    } catch (error) {
      logger.error('Failed to load patient context', error as Error, {
        component: 'CacheManager',
        userId,
      });
      throw error;
    }
  }

  /**
   * Cache conversation data with user_assistant filtering
   */
  static async cacheConversationsByAssistant(
    conversations: any[],
    assistant: UserAssistant
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.CONVERSATION_CACHE}_${assistant}`;
      const cachedData: CachedData = {
        timestamp: Date.now(),
        data: conversations,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));

      logger.info('Conversations cached by assistant', {
        component: 'CacheManager',
        assistant,
        conversationCount: conversations.length,
      });
    } catch (error) {
      logger.error('Failed to cache conversations', error as Error, {
        component: 'CacheManager',
        assistant,
      });
      throw error;
    }
  }

  /**
   * Get cached conversations for specific assistant
   */
  static async getCachedConversations(
    assistant: UserAssistant
  ): Promise<any[] | null> {
    try {
      const cacheKey = `${CACHE_KEYS.CONVERSATION_CACHE}_${assistant}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const cachedData: CachedData = JSON.parse(cached);

      // Check if cache is fresh (less than 5 minutes old)
      const isFresh = Date.now() - cachedData.timestamp < 5 * 60 * 1000;

      if (!isFresh) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      logger.error('Failed to get cached conversations', error as Error, {
        component: 'CacheManager',
        assistant,
      });
      return null;
    }
  }
}

/**
 * Backend Integration Functions
 */
export class BackendIntegration {
  /**
   * Update user_assistant in backend
   */
  static async updateUserAssistant(
    userId: string,
    newAssistant: UserAssistant
  ): Promise<void> {
    try {
      logger.info('Updating user_assistant in backend', {
        component: 'BackendIntegration',
        userId,
        newAssistant,
      });

      // Use the actual medicusUser service (dynamic import to avoid circular dependency)
      const { updateUserAssistant } = await import('@/services');
      await updateUserAssistant(newAssistant);

      logger.info('Backend user_assistant updated successfully', {
        component: 'BackendIntegration',
        userId,
        newAssistant,
      });
    } catch (error) {
      logger.error(
        'Failed to update user_assistant in backend',
        error as Error,
        {
          component: 'BackendIntegration',
          userId,
          newAssistant,
        }
      );
      throw error;
    }
  }

  /**
   * Fetch conversations filtered by user_assistant
   */
  static async fetchConversationsByAssistant(
    userId: string,
    assistant: UserAssistant
  ): Promise<any[]> {
    try {
      logger.info('Fetching conversations by assistant', {
        component: 'BackendIntegration',
        userId,
        assistant,
      });

      // Use the actual medicusConvo service (dynamic import to avoid circular dependency)
      const { fetchConversations } = await import('@/services');
      const conversationsResponse = await fetchConversations({
        assistant,
        page: 1,
        pageSize: 50, // Fetch more conversations for better caching
      });

      logger.info('Conversations fetched successfully', {
        component: 'BackendIntegration',
        userId,
        assistant,
        conversationCount: conversationsResponse.results.length,
        totalCount: conversationsResponse.count,
      });

      return conversationsResponse.results;
    } catch (error) {
      logger.error('Failed to fetch conversations', error as Error, {
        component: 'BackendIntegration',
        userId,
        assistant,
      });
      throw error;
    }
  }
}

/**
 * Main Role Switching Function
 */
export class RoleSwitcher {
  /**
   * Switch user role with complete context management
   */
  static async switchToPatientMode(options: RoleSwitchOptions): Promise<void> {
    const {
      targetAssistant,
      currentUserRole,
      userId,
      onNavigationChange,
      onCacheCleared,
      onBackendUpdated,
    } = options;

    try {
      logger.info('Starting role switch to patient mode', {
        component: 'RoleSwitcher',
        targetAssistant,
        currentUserRole,
        userId,
      });

      // Step 1: Clear doctor cache
      await CacheManager.clearDoctorCache();
      onCacheCleared?.();

      // Step 2: Clear React Query cache to force fresh data fetches
      try {
        const { queryClient } = await import('@/providers/QueryProvider');
        queryClient.clear();
        logger.info('React Query cache cleared', {
          component: 'RoleSwitcher',
        });
      } catch (error) {
        logger.error('Failed to clear React Query cache', error as Error, {
          component: 'RoleSwitcher',
        });
      }

      // Step 3: Clear Zustand patient store to remove stale data
      try {
        const { usePatientStore } = await import('@/stores/patientStore');
        usePatientStore.getState().clearCache();
        logger.info('Zustand patient store cleared', {
          component: 'RoleSwitcher',
        });
      } catch (error) {
        logger.error('Failed to clear Zustand patient store', error as Error, {
          component: 'RoleSwitcher',
        });
      }

      // Step 4: Reset selectedDependent to 'main'
      const SELECTED_DEPENDENT_KEY = '@MediApp:selectedDependent';
      await AsyncStorage.setItem(SELECTED_DEPENDENT_KEY, 'main');
      logger.info('Reset selectedDependent to main', {
        component: 'RoleSwitcher',
      });

      // Step 5: Load patient context (fetch patient data)
      await CacheManager.loadPatientContext(userId);
      onBackendUpdated?.();

      // Step 6: Reload auth state to update patientProfile in AuthContext
      try {
        const { updateGlobalAuthState } =
          await import('@/hooks/auth/internal/authState');
        const { getCurrentPatientProfile } = await import('@/services');
        const { userStorage } = await import('@/utils');

        const user = await userStorage.getUser();
        if (user) {
          const patientProfile = await getCurrentPatientProfile(user);

          updateGlobalAuthState({
            patientProfile,
            doctorProfile: null, // Clear doctor profile when switching to patient mode
          });

          logger.info('Auth state updated with patient profile', {
            component: 'RoleSwitcher',
            hasPatientProfile: !!patientProfile,
            patientId: patientProfile?.id,
          });
        }
      } catch (error) {
        logger.error(
          'Failed to update auth state with patient profile',
          error as Error,
          {
            component: 'RoleSwitcher',
          }
        );
      }

      // Step 7: Update local storage for current mode
      await AsyncStorage.setItem(CACHE_KEYS.CURRENT_MODE, targetAssistant);

      // Step 8: Navigate to patient dashboard
      onNavigationChange?.('/tabs/patients');

      logger.info('Role switch to patient mode completed', {
        component: 'RoleSwitcher',
        targetAssistant,
        userId,
      });
    } catch (error) {
      logger.error('Failed to switch to patient mode', error as Error, {
        component: 'RoleSwitcher',
        targetAssistant,
        userId,
      });
      throw error;
    }
  }

  /**
   * Check if user can switch back to doctor mode
   * (Always returns false - requires logout/login)
   */
  static canSwitchBackToDoctor(): boolean {
    return false; // BRD requirement: one-way switch only
  }

  /**
   * Get current mode from storage
   */
  static async getCurrentMode(): Promise<UserAssistant | null> {
    try {
      const mode = await AsyncStorage.getItem(CACHE_KEYS.CURRENT_MODE);
      return mode as UserAssistant | null;
    } catch (error) {
      logger.error('Failed to get current mode', error as Error, {
        component: 'RoleSwitcher',
      });
      return null;
    }
  }

  /**
   * Reset all role-related data (called on logout)
   */
  static async resetAllData(): Promise<void> {
    try {
      const SELECTED_DEPENDENT_KEY = '@MediApp:selectedDependent';
      await Promise.all([
        CacheManager.clearDoctorCache(),
        CacheManager.clearPatientCache(),
        AsyncStorage.removeItem(CACHE_KEYS.CURRENT_MODE),
        AsyncStorage.removeItem(SELECTED_DEPENDENT_KEY),
      ]);

      logger.info('Resetting all role data...', {
        component: 'RoleSwitcher',
        keys: [
          CACHE_KEYS.DOCTOR_CACHE,
          CACHE_KEYS.PATIENT_CACHE,
          CACHE_KEYS.CURRENT_MODE,
          SELECTED_DEPENDENT_KEY,
        ],
      });

      await Promise.all([
        CacheManager.clearDoctorCache(),
        CacheManager.clearPatientCache(),
        AsyncStorage.removeItem(CACHE_KEYS.CURRENT_MODE),
        AsyncStorage.removeItem(SELECTED_DEPENDENT_KEY),
      ]);

      logger.info('All role data reset successfully', {
        component: 'RoleSwitcher',
      });
    } catch (error) {
      logger.error('Failed to reset all role data', error as Error, {
        component: 'RoleSwitcher',
      });
      throw error;
    }
  }
}

/**
 * Navigation Helper Functions
 */
export class NavigationHelper {
  /**
   * Get appropriate dashboard route based on user assistant
   */
  static getDashboardRoute(assistant: UserAssistant): string {
    return assistant === 'medidoc' ? '/tabs/doctor' : '/tabs/patients';
  }

  /**
   * Get appropriate settings route based on user assistant
   */
  static getSettingsRoute(assistant: UserAssistant): string {
    return '/tabs/settings'; // Same route but different content
  }

  /**
   * Clear navigation history to prevent back navigation to doctor mode
   */
  static clearNavigationHistory(): void {
    // Clear the navigation stack by replacing current route
    // This prevents users from navigating back to doctor mode pages
    logger.info('Navigation history cleared', {
      component: 'NavigationHelper',
    });

    // Note: The actual implementation uses router.replace() in the main switching function
    // to prevent navigation back to doctor mode
  }
}

/**
 * Export main functions for easy use
 */
export const switchToPatientMode = RoleSwitcher.switchToPatientMode;
export const canSwitchBackToDoctor = RoleSwitcher.canSwitchBackToDoctor;
export const getCurrentMode = RoleSwitcher.getCurrentMode;
export const resetAllData = RoleSwitcher.resetAllData;
export const clearDoctorCache = CacheManager.clearDoctorCache;
export const clearPatientCache = CacheManager.clearPatientCache;
export const getDashboardRoute = NavigationHelper.getDashboardRoute;
export const getSettingsRoute = NavigationHelper.getSettingsRoute;
