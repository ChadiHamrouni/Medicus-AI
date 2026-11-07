import { AuthState } from '@/types/auth';
import { logger } from '@/utils';

// Global state
let globalAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true, // Start with loading=true during app initialization
  error: null,
  // Profile data from materialized views - loaded at login time
  doctorProfile: null,
  patientProfile: null,
};

// Global state update listeners
const listeners = new Set<(_newState: AuthState) => void>();

export const getGlobalAuthState = () => globalAuthState;
export const getAuthListenerCount = () => listeners.size;

// Global state updater
export const updateGlobalAuthState = (updates: Partial<AuthState>) => {
  const previousState = { ...globalAuthState };
  globalAuthState = { ...globalAuthState, ...updates };

  // Enhanced logging to debug state changes
  logger.info('Global auth state updated:', {
    previous: {
      isAuthenticated: previousState.isAuthenticated,
      hasUser: !!previousState.user,
      userId: previousState.user?.id,
    },
    current: {
      isAuthenticated: globalAuthState.isAuthenticated,
      hasUser: !!globalAuthState.user,
      userId: globalAuthState.user?.id,
    },
    updates,
    timestamp: new Date().toISOString(),
  });

  // Notify all listeners
  listeners.forEach((listener, index) => {
    logger.info(`Notifying listener ${index} of auth state change`);
    listener(globalAuthState);
  });
};

export const subscribeToAuthState = (
  listener: (newState: AuthState) => void
) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
