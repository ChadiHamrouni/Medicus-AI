import { tokenStorage } from './storage';
import { logger } from './logger';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Queue for requests waiting for token refresh to complete
 */
const requestQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Process all queued requests with the new token
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  requestQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  requestQueue.length = 0;
};

/**
 * Refresh the access token using the refresh token
 */
const refreshAccessToken = async (): Promise<string> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { env } = await import('./env');
      const API_BASE_URL = env.medicusUserApiBaseUrl;

      logger.info('Attempting to refresh access token', {
        component: 'apiClient',
      });

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (networkError) {
        logger.error('Network error during token refresh', networkError as Error, {
          component: 'apiClient',
        });
        // NETWORK ERROR: Do NOT clear tokens. Throw so UI can handle it.
        throw networkError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.detail ||
          errorData?.message ||
          `Token refresh failed with status ${response.status}`;

        logger.error('Token refresh failed', new Error(errorMessage), {
          component: 'apiClient',
          status: response.status,
          errorData,
        });

        // AUTH ERROR: Clear tokens only if explicitly rejected (4xx)
        // 5xx errors should typically be treated as temporary server issues, not auth failures
        if (response.status >= 400 && response.status < 500) {
          await tokenStorage.clearTokens();
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;

      await tokenStorage.storeTokens(newAccessToken, newRefreshToken);

      logger.info('Access token refreshed successfully', {
        component: 'apiClient',
      });

      processQueue(null, newAccessToken);

      return newAccessToken;
    } catch (error) {
      // If we cleared tokens above (4xx), we want to reject queue with auth error
      // If network error, we want to reject queue with network error

      const isAuthError = (error as any).message === 'No refresh token available' ||
        (await tokenStorage.getRefreshToken()) === null;

      if (isAuthError) {
        logger.error(
          'Token refresh failed with auth error, clearing auth state',
          error as Error,
          {
            component: 'apiClient',
          }
        );
        await tokenStorage.clearTokens();
      }

      processQueue(error as Error, null);

      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Authenticated fetch wrapper that automatically handles token refresh on 401 errors
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (headers will be merged with auth header)
 * @returns Promise<Response>
 *
 * @example
 * const response = await authenticatedFetch('/api/users/me');
 * const data = await response.json();
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  let token = await tokenStorage.getAccessToken();

  if (!token) {
    // Check if refresh is already in progress
    if (isRefreshing && refreshPromise) {
      logger.info('No token, but refresh in progress - waiting', {
        component: 'apiClient',
        url,
      });
      try {
        token = await refreshPromise;
      } catch (error) {
        logger.error('Failed to get token from ongoing refresh', error as Error, {
          component: 'apiClient',
        });
        // Propagate the original error (e.g. Network Error) if we still have a refresh token
        // indicating it wasn't a fatal auth failure
        if (await tokenStorage.getRefreshToken()) {
          throw error;
        }
        throw new Error('No authentication token available');
      }
    } else {
      // Try to refresh the token if we don't have one
      try {
        logger.info('No access token found, attempting refresh', {
          component: 'apiClient',
          url,
        });
        token = await refreshAccessToken();
      } catch (error) {
        // Only throw if refresh fails
        logger.error('Failed to get initial token via refresh', error as Error, {
          component: 'apiClient',
        });
        if (await tokenStorage.getRefreshToken()) {
          throw error;
        }
        throw new Error('No authentication token available');
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logger.info('Received 401, attempting token refresh', {
      component: 'apiClient',
      url,
    });

    try {
      if (isRefreshing) {
        logger.info('Token refresh already in progress, queuing request', {
          component: 'apiClient',
          url,
        });

        token = await new Promise<string>((resolve, reject) => {
          requestQueue.push({ resolve, reject });
        });
      } else {
        token = await refreshAccessToken();
      }

      logger.info('Retrying request with new token', {
        component: 'apiClient',
        url,
      });

      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      logger.error(
        'Failed to refresh token and retry request',
        error as Error,
        {
          component: 'apiClient',
          url,
        }
      );

      throw error;
    }
  }

  return response;
};
