/**
 * Shared error handling utilities for consistent error processing across hooks
 */

import { tokenStorage, logger } from '@/utils';
import { useCallback } from 'react';

// will be set by useAuth hook
let globalAuthStateClearer: (() => void) | null = null;

export const setGlobalAuthStateClearer = (clearer: () => void) => {
  globalAuthStateClearer = clearer;
};

export interface ErrorHandlingConfig {
  component: string;
  context?: Record<string, any>;
  showUserFriendlyMessage?: boolean;
}

export function isAuthError(error: Error): boolean {
  return (
    error.message?.includes('Authentication failed') ||
    error.message?.includes('401') ||
    error.message?.includes('403') ||
    error.message?.includes('Token expired') ||
    error.message?.includes('Invalid token')
  );
}

export async function handleAuthError(
  error: Error,
  component: string
): Promise<void> {
  logger.error(`Authentication error in ${component}`, error, {
    component,
    action: 'handleAuthError',
  });

  // Clear tokens
  try {
    await tokenStorage.clearTokens();
  } catch (tokenError) {
    logger.error('Failed to clear tokens', tokenError as Error, {
      component,
      action: 'clearTokens',
    });
  }

  // Clear global auth state if available
  if (globalAuthStateClearer) {
    globalAuthStateClearer();
  }
}

export function getErrorMessage(error: Error): string {
  if (isAuthError(error)) {
    return 'Authentication required. Please sign in again.';
  }

  if (
    error.message?.includes('fetch') ||
    error.message?.includes('Network') ||
    error.message?.includes('Failed to fetch')
  ) {
    return 'Network connection problem. Please check your internet connection.';
  }

  if (error.message?.includes('500')) {
    return 'Server error. Please try again later.';
  }

  if (
    error.message?.includes('502') ||
    error.message?.includes('503') ||
    error.message?.includes('504')
  ) {
    return 'Service temporarily unavailable. Please try again.';
  }

  return error.message || 'An unexpected error occurred.';
}

export function shouldRetryError(
  error: any,
  failureCount: number,
  maxRetries: number = 2
): boolean {
  // Don't retry auth errors - user needs to login again
  if (isAuthError(error)) {
    return false;
  }

  // Only retry network errors and server errors, up to maxRetries
  if (
    error.message?.includes('fetch') ||
    error.message?.includes('Network') ||
    error.message?.includes('500') ||
    error.message?.includes('502') ||
    error.message?.includes('503') ||
    error.message?.includes('504')
  ) {
    return failureCount < maxRetries;
  }

  // Don't retry other errors (like 400, validation errors, etc.)
  return false;
}

export function useErrorHandler(config: ErrorHandlingConfig) {
  const logError = useCallback(
    async (error: Error, context?: Record<string, any>) => {
      logger.error(`${config.component} error`, error, {
        component: config.component,
        ...config.context,
        ...context,
      });

      // Handle auth errors automatically
      if (isAuthError(error)) {
        await handleAuthError(error, config.component);
      }
    },
    [config]
  );

  const getDisplayError = useCallback(
    (error: Error | null) => {
      if (!error) return null;
      return config.showUserFriendlyMessage
        ? getErrorMessage(error)
        : error.message;
    },
    [config.showUserFriendlyMessage]
  );

  return {
    logError,
    getDisplayError,
  };
}
