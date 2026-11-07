import { env } from '@/utils/infrastructure/env';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Initialize Sentry with configuration
export const initializeSentry = () => {
  const dsn = env.sentryDsn;

  if (!dsn) {
    if (__DEV__) {
      console.warn(
        'Sentry DSN not provided. Crash reporting disabled in development.'
      );
    }
    return;
  }

  Sentry.init({
    dsn,
    debug: false, // Disable verbose Sentry logging
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,
    // Enable tracing to capture HTTP requests
    // enableTracing: true, // Deprecated in v7
    // enableCaptureFailedRequests: true, // Deprecated/Moved in v7
    beforeSend(event) {
      // Filter out known non-critical errors in development
      if (__DEV__) {
        // Filter out React Native yellow box warnings
        if (
          event.message?.includes('Warning:') ||
          event.message?.includes('YellowBox')
        ) {
          return null;
        }
      }

      // Keep network errors but ensure they have context
      if (
        event.exception?.values?.[0]?.value?.includes('Network request failed')
      ) {
        event.level = 'warning';
      }

      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Ensure HTTP breadcrumbs include full URL details
      if (
        breadcrumb.category === 'http' ||
        breadcrumb.category === 'fetch' ||
        breadcrumb.category === 'xhr'
      ) {
        // Already has URL data, just ensure it's preserved
        return breadcrumb;
      }
      return breadcrumb;
    },
    integrations: defaultIntegrations => {
      // Keep HTTP integration for URL tracking
      if (__DEV__) {
        return defaultIntegrations.filter(
          integration =>
            integration.name !== 'TouchEventBoundary' &&
            integration.name !== 'UserInteraction' &&
            integration.name !== 'ReactNativeProfiler'
        );
      }
      return defaultIntegrations;
    },
    tracesSampleRate: __DEV__ ? 0.5 : 0.1, // Enable some tracing in dev for debugging
  });

  // Set app context
  Sentry.setContext('app', {
    name: Constants.expoConfig?.name || 'MediApp',
    version: Constants.expoConfig?.version || '1.0.0',
    buildVersion:
      Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode ||
      'unknown',
    platform: Constants.platform,
    expo_version: Constants.expoVersion,
  });
};

// Error reporting utilities with enhanced context
export const reportError = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('error_context', context);
  }

  Sentry.captureException(error);
};

// Report network errors with URL context
export const reportNetworkError = (
  error: Error,
  url: string,
  method?: string,
  statusCode?: number,
  additionalContext?: Record<string, any>
) => {
  Sentry.setContext('network_request', {
    url,
    method: method || 'GET',
    statusCode,
    ...additionalContext,
  });

  addBreadcrumb(`Network error: ${method || 'GET'} ${url}`, 'http', 'error', {
    url,
    method,
    statusCode,
    error: error.message,
  });

  Sentry.captureException(error);
};

export const reportMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  if (context) {
    Sentry.setContext('message_context', context);
  }

  Sentry.captureMessage(message, level);
};

// User context management
export const setUserContext = (user: {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}) => {
  Sentry.setUser(user);
};

export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Tag management
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

export const setTags = (tags: Record<string, string>) => {
  Sentry.setTags(tags);
};

// Breadcrumb utilities for better debugging
export const addBreadcrumb = (
  message: string,
  category?: string,
  level?: Sentry.SeverityLevel,
  data?: any
) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};

// Specific breadcrumbs for app events
export const trackNavigationEvent = (screen: string, params?: any) => {
  addBreadcrumb(`Navigation: ${screen}`, 'navigation', 'info', params);
};

export const trackUserAction = (action: string, data?: any) => {
  addBreadcrumb(`User Action: ${action}`, 'user', 'info', data);
};

// Track API requests
export const trackApiRequest = (
  url: string,
  method: string,
  statusCode?: number,
  duration?: number,
  error?: boolean
) => {
  addBreadcrumb(`API ${method} ${url}`, 'http', error ? 'error' : 'info', {
    url,
    method,
    statusCode,
    duration,
    error,
  });
};

// Performance monitoring
export const startTransaction = (name: string, op?: string) => {
  return null;
};

// Sentry instance for advanced usage
export { Sentry };
