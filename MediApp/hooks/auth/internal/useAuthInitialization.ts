import {
  isAuthenticated as checkIsAuthenticated,
  getDoctorProfile,
  getCurrentPatientProfile,
} from '@/services';
import { logger, tokenStorage, userStorage } from '@/utils';
import { updateGlobalAuthState } from './authState';
import { UserStatus } from '@/types';

// Initialize auth state on app startup
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

export const initializeAuthState = async () => {
  if (isInitialized && !initializationPromise) return;

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    if (isInitialized) return;

    try {
      // Early check for expired refresh token
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        const isRefreshExpired = await tokenStorage.isRefreshTokenExpired();
        if (isRefreshExpired) {
          logger.warn('Refresh token expired during initialization, clearing auth state', {
            component: 'useAuth',
          });
          await tokenStorage.clearTokens();
          await userStorage.removeUser();
          updateGlobalAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
          });
          return;
        }
      }

      const isAuth = await checkIsAuthenticated();
      if (isAuth) {
        const accessToken = await tokenStorage.getAccessToken();
        const refreshToken = await tokenStorage.getRefreshToken();

        // Get user data from storage (saved during login) - avoid redundant /users/me call
        let user = await userStorage.getUser();

        if (!user) {
          logger.warn('No user found in storage during initialization', {
            component: 'useAuth',
          });
          updateGlobalAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
          });
          return;
        }

        // Fetch complete user profile including patient/doctor data
        let doctorProfile = null;
        let patientProfile = null;

        if (user?.id) {
          // Check current mode from AsyncStorage to determine which profile to load
          // This is important for doctors who have switched to patient mode
          const CACHE_KEYS = {
            CURRENT_MODE: '@MediApp:userAssistant',
          };

          let currentMode: string | null = null;
          try {
            const AsyncStorage =
              await import('@react-native-async-storage/async-storage');
            currentMode = await AsyncStorage.default.getItem(
              CACHE_KEYS.CURRENT_MODE
            );

            // Default mode for doctor if not set
            if (!currentMode && user.role === 'doctor') {
              currentMode = 'medidoc';
              await AsyncStorage.default.setItem(
                CACHE_KEYS.CURRENT_MODE,
                'medidoc'
              );
            }
          } catch (error) {
            logger.debug('Failed to get current mode from storage', {
              component: 'useAuth',
              error: error instanceof Error ? error.message : String(error),
            });
          }

          const shouldLoadDoctorProfile =
            user.role === 'doctor' && currentMode === 'medidoc';
          const shouldLoadPatientProfile =
            user.role === 'patient' ||
            (user.role === 'doctor' && currentMode === 'mediaid');

          if (shouldLoadDoctorProfile) {
            try {
              doctorProfile = await getDoctorProfile();
            } catch (error) {
              logger.debug(
                'Failed to fetch doctor profile during initialization',
                {
                  component: 'useAuth',
                  userId: String(user.id),
                  error: error instanceof Error ? error.message : String(error),
                }
              );
            }
          }

          // For patients OR doctors in patient mode: fetch patient profile
          if (shouldLoadPatientProfile) {
            try {
              patientProfile = await getCurrentPatientProfile(user);

              // Extract user data from patient profile to avoid redundant /users/me call (with null safety)
              if (patientProfile && user) {
                user = {
                  ...user,
                  // Only override if patient profile has valid (non-null) values
                  email: patientProfile.email || user.email,
                  phone_number:
                    patientProfile.phone_number || user.phone_number,
                  display_name:
                    patientProfile.display_name ||
                    patientProfile.full_name ||
                    user.display_name,
                  first_name: patientProfile.first_name || user.first_name,
                  last_name: patientProfile.last_name || user.last_name,
                  account_status:
                    (patientProfile.account_status as UserStatus) ||
                    user.account_status,
                  is_email_verified:
                    patientProfile.is_verified !== undefined
                      ? !!patientProfile.is_verified
                      : user.is_email_verified,
                };
              }
            } catch (error) {
              logger.warn(
                'Failed to fetch patient profile during initialization - continuing with cached user data',
                {
                  component: 'useAuth',
                  userId: user?.id ? String(user.id) : undefined,
                  currentMode,
                  error: error instanceof Error ? error.message : String(error),
                }
              );
            }
          }

          logger.info('Loaded user profiles during initialization', {
            component: 'useAuth',
            userId: user?.id ? String(user.id) : undefined,
            hasDoctorProfile: !!doctorProfile,
            hasPatientProfile: !!patientProfile,
          });
        }

        updateGlobalAuthState({
          isAuthenticated: true,
          user: user,
          token: accessToken,
          refreshToken: refreshToken,
          doctorProfile,
          patientProfile,
          isLoading: false, // Initialization complete
        });

        logger.info('Auth state initialized from persisted data', {
          component: 'useAuth',
          userId: user?.id ? String(user.id) : undefined,
          role: user?.role,
          hasPatientProfile: !!patientProfile,
          hasDoctorProfile: !!doctorProfile,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
        });
      } else {
        // If not authenticated (tokens expired or invalid), clear state
        updateGlobalAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          refreshToken: null,
          isLoading: false, // Initialization complete
        });

        logger.info('Auth state cleared - no valid authentication found', {
          component: 'useAuth',
        });
      }
    } catch (error) {
      logger.error('Failed to initialize auth state', error as Error, {
        component: 'useAuth',
      });

      // On error, ensure auth state is cleared
      updateGlobalAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false, // Initialization complete even on error
      });
    } finally {
      isInitialized = true;
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};
