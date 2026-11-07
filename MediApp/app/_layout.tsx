// IMPORTANT: Must be imported first for UUID generation to work with Hermes
import 'react-native-get-random-values';

import './../global.css';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LogBox, Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

LogBox.ignoreAllLogs(true);

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppContextProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { DependentsProvider } from '@/contexts/DependentsContext';

import { DoctorViewProvider } from '@/contexts/DoctorViewContext';
import { PatientProvider } from '@/contexts/PatientContext';
import { PatientViewProvider } from '@/contexts/PatientViewContext';
import { ViewingDoctorProvider } from '@/contexts/ViewingDoctorContext';
// Removed useColorScheme - not needed with Expo Router

import { DoctorProfileSyncProvider } from '@/providers/DoctorProfileSyncProvider';
import { PatientSyncProvider } from '@/providers/PatientSyncProvider';
import { QueryProvider } from '@/providers/QueryProvider';

// import { initializeSentry, reportError } from '@/services';
import { notificationService } from '@/services/notifications/notifications';
import { markNavigationReady } from '@/services/notifications/notificationDeepLink';
import { env, logger, offlineManager } from '@/utils';
// import * as Sentry from '@sentry/react-native';

// if (!__DEV__) {
//   Sentry.init({

//     // Adds more context data to events (IP address, cookies, user, etc.)
//     // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
//     sendDefaultPii: true,

//     // Disable debug logging
//     debug: false,

//     // Configure Session Replay
//     replaysSessionSampleRate: 0.1,
//     replaysOnErrorSampleRate: 1,
//     integrations: [
//       Sentry.mobileReplayIntegration(),
//       Sentry.feedbackIntegration(),
//     ],
//   });
// }

export default function RootLayout() {
  // Disable font scaling globally
  (Text as any).defaultProps = {
    ...(Text as any).defaultProps,
    allowFontScaling: false,
  };

  (TextInput as any).defaultProps = {
    ...(TextInput as any).defaultProps,
    allowFontScaling: false,
  };

  // Initialize token persistence monitoring

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize app on startup
  React.useEffect(() => {
    // Validate environment variables
    try {
      env.validateRequiredEnvVars();
      env.logEnvironmentInfo();
    } catch {
      // Environment validation failed
    }

    // Initialize Sentry (disabled)
    // initializeSentry();

    // Initialize push notifications (permissions + listeners)
    logger.info('Calling notificationService.initialize()', {
      component: 'RootLayout',
    });
    notificationService
      .initialize()
      .then(() => {
        logger.info(
          'notificationService.initialize() succeeded, checking cold start',
          { component: 'RootLayout' }
        );
        // Check if the app was opened by tapping a notification (cold-start)
        notificationService.handleColdStartNotification().catch(e => {
          logger.error('Cold-start notification check failed', e, {
            component: 'RootLayout',
          });
        });
      })
      .catch(e => {
        logger.error('Notification initialization failed', e, {
          component: 'RootLayout',
        });
      });

    // Mark navigation ready after a tick so queued cold-start routes flush
    // once the navigator is mounted
    const readyTimer = setTimeout(() => {
      markNavigationReady();
    }, 500);

    // Initialize offline manager
    offlineManager.initialize().catch(() => {
      // Failed to initialize offline manager
    });

    // Handle app state changes for JWT expiration manager
    // const handleAppStateChange = (nextAppState: string) => {
    //   if (nextAppState === 'active') {
    //     // App came to foreground - resume JWT monitoring
    //     // jwtExpirationManager.resume();
    //   } else if (nextAppState === 'background' || nextAppState === 'inactive') {
    //     // App went to background - pause JWT monitoring
    //     // jwtExpirationManager.pause();
    //   }
    // };

    // Add app state listener
    // const subscription = AppState.addEventListener(
    //   'change',
    //   handleAppStateChange
    // );

    // Cleanup function
    return () => {
      clearTimeout(readyTimer);
      // subscription?.remove();
      notificationService.cleanup();
    };
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // Root Error Boundary error logged
            // Send to Sentry (disabled)
            // reportError(error, {
            //   component: 'RootLayout',
            //   componentStack: errorInfo.componentStack,
            // });
            console.error('Root error:', error, errorInfo);
          }}
        >
          <QueryProvider>
            <AuthProvider>
              <DoctorProfileSyncProvider>
                <PatientSyncProvider>
                  <AppContextProvider>
                    <PatientProvider>
                      <DependentsProvider>
                        <DoctorViewProvider>
                          <PatientViewProvider>
                            <ViewingDoctorProvider>
                              <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" />
                                <Stack.Screen
                                  name="pdf-viewer"
                                  options={{ presentation: 'modal' }}
                                />
                              </Stack>
                            </ViewingDoctorProvider>
                          </PatientViewProvider>
                        </DoctorViewProvider>
                      </DependentsProvider>
                    </PatientProvider>
                  </AppContextProvider>
                </PatientSyncProvider>
              </DoctorProfileSyncProvider>
            </AuthProvider>
          </QueryProvider>
          <StatusBar style="auto" />
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
