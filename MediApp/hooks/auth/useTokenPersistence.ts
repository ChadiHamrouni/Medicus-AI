import { handleTokenExpiredLogout, tokenExpirationManager } from '@/utils';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook to handle token expiration persistence across app state changes
 * Automatically restores token expiration timer when app returns to foreground
 */
export const useTokenPersistence = () => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Try to restore timer on initial mount (app startup)
    const restoreOnMount = async () => {
      try {
        const restored =
          await tokenExpirationManager.restoreTimerFromPersistence(
            handleTokenExpiredLogout
          );
        if (restored) {
        }
      } catch (error) {
        console.error('Failed to restore token timer on mount:', error);
      }
    };

    restoreOnMount();

    // Listen for app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      // App is coming to foreground from background
      if (
        previousState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        try {
          const restored =
            await tokenExpirationManager.restoreTimerFromPersistence(
              handleTokenExpiredLogout
            );
          if (restored) {
          } else {
          }
        } catch (error) {
          console.error(
            'Failed to restore token timer after app resume:',
            error
          );
        }
      }

      // App is going to background - timer continues but persistence ensures recovery
      if (nextAppState.match(/inactive|background/)) {
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    restoreTimer: () =>
      tokenExpirationManager.restoreTimerFromPersistence(
        handleTokenExpiredLogout
      ),
    clearPersistedToken: () =>
      tokenExpirationManager.clearPersistedExpirationTime(),
  };
};
