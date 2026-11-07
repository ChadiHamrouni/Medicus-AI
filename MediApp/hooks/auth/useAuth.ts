/**
 * Custom hook for handling user authentication
 * Provides login functionality with comprehensive error handling and state management
 */

import {
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} from './mutations/useAuthMutations';
import { setGlobalAuthStateClearer } from '../shared/useErrorHandling';
import {
  isAuthenticated as checkIsAuthenticated,
  getCurrentUser as getCurrentUserService,
  socketIOService,
} from '@/services';
import {
  AuthError,
  AuthState,
  LoginResponse,
  UserResponse,
} from '@/types/auth';
import { logger, tokenStorage, userStorage, resetAllData } from '@/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getGlobalAuthState,
  getAuthListenerCount,
  updateGlobalAuthState,
  subscribeToAuthState,
} from './internal/authState';
import { initializeAuthState } from './internal/useAuthInitialization';
import {
  performLogin,
  handleAuthSuccess as handleAuthSuccessAction,
} from './internal/useAuthLogin';
import { notificationService } from '@/services/notifications/notifications';

export interface UseAuthReturn {
  authState: AuthState;
  // eslint-disable-next-line no-unused-vars
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<UserResponse | null>;
  isAuthenticated: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();

  // React Query mutations
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const refreshTokenMutation = useRefreshTokenMutation();

  // Local state that syncs with global state
  const [authState, setAuthState] = useState<AuthState>(getGlobalAuthState());

  // Refs to hold latest functions without causing re-renders
  const refreshAuthRef = useRef<(() => Promise<void>) | null>(null);
  const logoutRef = useRef<(() => Promise<void>) | null>(null);

  // Subscribe to global state changes
  useEffect(() => {
    const listener = (newState: AuthState) => {
      logger.info('useAuth received state update:', {
        isAuthenticated: newState.isAuthenticated,
        hasUser: !!newState.user,
        userId: newState.user?.id ? String(newState.user.id) : undefined,
      });
      setAuthState(newState);
    };

    const unsubscribe = subscribeToAuthState(listener);

    // Set initial state from current global state
    setAuthState(getGlobalAuthState());

    // Initialize auth state from persisted data - but don't block
    initializeAuthState().catch(error => {
      logger.error('Auth initialization failed', error as Error, {
        component: 'useAuth',
      });
    });

    // Register global auth state clearer for error handling
    setGlobalAuthStateClearer(() => {
      updateGlobalAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
      });
    });

    socketIOService.onTokenRefresh((newToken: string) => {
      logger.info(
        '🔄 useAuth received token refresh from Socket.IO - updating global state',
        {
          component: 'useAuth',
        }
      );
      updateGlobalAuthState({ token: newToken });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Clear any authentication error
   */
  const clearError = useCallback(() => {
    updateGlobalAuthState({ error: null });
  }, []);

  /**
   * Update authentication state
   */
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    updateGlobalAuthState(updates);
  }, []);

  /**
   * Handle authentication success
   */
  const handleAuthSuccess = useCallback(
    async (loginResponse: LoginResponse) => {
      await handleAuthSuccessAction(loginResponse, updateGlobalAuthState);
    },
    []
  );

  /**
   * Handle authentication error
   */
  const handleAuthError = useCallback(
    (error: Error) => {
      const authError: AuthError = {
        message: 'Sign in failed. Please check your credentials and try again.',
        code: 'AUTH_ERROR',
      };

      updateAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        error: authError,
      });

      logger.error('Authentication error handled', error, {
        component: 'useAuth',
      });
    },
    [updateAuthState]
  );

  /**
   * Logout user and clear authentication state
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      updateAuthState({ isLoading: true });

      await logoutMutation.mutateAsync();

      // Unregister push token
      await notificationService.unregisterFromBackend();

      // Clear all role switching data
      await resetAllData();

      // Clear secure storage
      await tokenStorage.clearTokens();
      await userStorage.removeUser();

      updateAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        doctorProfile: null,
        patientProfile: null,
        isLoading: false,
        error: null,
      });

      // Navigate to sign-in after successful logout
      router.replace('/(SignIn)/SignInScreen');

      logger.auditLog(
        'user_logout_completed',
        authState.user?.id ? String(authState.user.id) : ''
      );
    } catch (error) {
      logger.error('Logout failed', error as Error, {
        component: 'useAuth',
      });

      // Even if logout fails, clear local state and role data
      try {
        await resetAllData();
      } catch (resetError) {
        logger.error(
          'Failed to reset role data during logout',
          resetError as Error,
          {
            component: 'useAuth',
          }
        );
      }

      // Clear secure storage even on failure
      await tokenStorage.clearTokens();
      await userStorage.removeUser();

      updateAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        doctorProfile: null,
        patientProfile: null,
        isLoading: false,
        error: null,
      });

      router.replace('/(SignIn)/SignInScreen');
    }
  }, [updateAuthState, router, authState.user?.id, logoutMutation]);

  /**
   * Login user with email or phone and password
   */
  const login = useCallback(
    async (identifier: string, password: string): Promise<void> => {
      await performLogin(
        identifier.replaceAll(' ', ''),
        password,
        loginMutation,
        updateGlobalAuthState,
        clearError,
        handleAuthError,
        router,
        logout
      );
    },
    [clearError, handleAuthError, router, logout, loginMutation]
  );

  /**
   * Refresh authentication token
   */
  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      updateAuthState({ isLoading: true, error: null });

      const loginResponse = await refreshTokenMutation.mutateAsync();
      await handleAuthSuccess(loginResponse as LoginResponse);

      logger.info('Authentication refreshed successfully', {
        component: 'useAuth',
        userId: String(loginResponse.user?.id),
      });
    } catch (error) {
      handleAuthError(error as Error);

      // If refresh fails, logout user
      await logout();

      logger.error('Auth refresh failed, user logged out', error as Error, {
        component: 'useAuth',
      });
    } finally {
      updateAuthState({ isLoading: false });
    }
  }, [
    updateAuthState,
    handleAuthSuccess,
    handleAuthError,
    logout,
    refreshTokenMutation,
  ]);

  /**
   * Get current user profile
   */
  const getCurrentUser = useCallback(async (): Promise<UserResponse | null> => {
    try {
      const user = await getCurrentUserService();

      updateAuthState({ user });

      return user;
    } catch (error) {
      logger.error('Get current user failed', error as Error, {
        component: 'useAuth',
      });

      return null;
    }
  }, [updateAuthState]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback(async (): Promise<boolean> => {
    try {
      const authenticated = await checkIsAuthenticated();

      updateAuthState({ isAuthenticated: authenticated });

      return authenticated;
    } catch (error) {
      logger.error('Authentication check failed', error as Error, {
        component: 'useAuth',
      });

      return false;
    }
  }, [updateAuthState]);

  // Initialize JWT expiration manager when auth functions are ready
  // useEffect(() => {
  //   const initializeJwtManager = async () => {
  //     try {
  //       // Only initialize if user is authenticated
  //       if (authState.isAuthenticated) {
  //         // Use current function references directly
  //         refreshAuthRef.current = refreshAuth;
  //         logoutRef.current = logout;

  //         const stableRefreshCallback = async () => {
  //           logger.info('JWT expiration manager triggering token refresh', {
  //             component: 'useAuth',
  //           });
  //           if (refreshAuthRef.current) {
  //             await refreshAuthRef.current();
  //           }
  //         };

  //         const stableLogoutCallback = async () => {
  //           logger.info(
  //             'JWT expiration manager triggering logout due to token expiration',
  //             {
  //               component: 'useAuth',
  //             }
  //           );
  //           if (logoutRef.current) {
  //             await logoutRef.current();
  //           }
  //         };

  //         // jwtExpirationManager.initialize(
  //         //   stableRefreshCallback,
  //         //   stableLogoutCallback
  //         // );

  //         // logger.info("JWT expiration manager initialized successfully", {
  //         //   component: "useAuth",
  //         //   userId: authState.user?.id ? String(authState.user.id) : undefined,
  //         // });
  //       } else {
  //         // Clean up JWT manager if user is not authenticated
  //         // jwtExpirationManager.destroy();
  //       }
  //     } catch (error) {
  //       logger.error(
  //         'Failed to initialize JWT expiration manager',
  //         error as Error,
  //         {
  //           component: 'useAuth',
  //         }
  //       );
  //     }
  //   };

  //   initializeJwtManager();
  // }, [authState.isAuthenticated, authState.user?.id, refreshAuth, logout]); // Keep dependencies but use refs

  // Update refs when functions change
  useEffect(() => {
    refreshAuthRef.current = refreshAuth;
    logoutRef.current = logout;
  }, [refreshAuth, logout]);

  // Clean up JWT manager on unmount
  // useEffect(() => {
  //   return () => {
  //     jwtExpirationManager.destroy();
  //   };
  // }, []);

  return {
    authState,
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    clearError,
  };
};
