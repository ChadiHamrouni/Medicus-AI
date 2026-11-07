import { LoginRequest, LoginResponse, UserResponse } from '@/types';
import {
  isTokenExpired,
  logger,
  env,
  tokenStorage,
  authenticatedFetch,
} from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Authenticate user with email and password
 */
export const login = async (
  identifier: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const loginRequest: LoginRequest = {
      identifier: identifier.trim().toLowerCase(),
      password,
    };

    const url = `${API_BASE_URL}/auth/login`;
    console.log('🔐 [LOGIN SERVICE] Attempting login to:', url);
    console.log('🔐 [LOGIN SERVICE] API_BASE_URL:', API_BASE_URL);
    console.log('🔐 [LOGIN SERVICE] Request payload:', {
      identifier: loginRequest.identifier,
      passwordLength: password.length,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(loginRequest),
    });

    console.log('🔐 [LOGIN SERVICE] Response status:', response.status);
    console.log('🔐 [LOGIN SERVICE] Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('🔐 [LOGIN SERVICE] Error response:', errorData);
      throw new Error(
        errorData.detail ||
          errorData.message ||
          `Login failed: ${response.status}`
      );
    }

    const loginResponse: LoginResponse = await response.json();
    console.log('🔐 [LOGIN SERVICE] Login successful, got tokens');

    return loginResponse;
  } catch (error) {
    console.log('🔐 [LOGIN SERVICE] Caught error:', error);
    console.log(
      '🔐 [LOGIN SERVICE] Error type:',
      error instanceof Error ? error.constructor.name : typeof error
    );
    console.log(
      '🔐 [LOGIN SERVICE] Error message:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

/**
 * Refresh authentication token
 */
export const refreshToken = async (): Promise<LoginResponse> => {
  try {
    const refreshToken = await tokenStorage.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    // Check for HTTP errors (4xx, 5xx)
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.detail ||
        errorData?.message ||
        `Token refresh failed with status ${response.status}`;

      throw new Error(errorMessage);
    }

    const refreshResponse = await response.json();

    const loginResponse: LoginResponse = {
      access_token: refreshResponse.access_token,
      refresh_token: refreshResponse.refresh_token,
      token_type: refreshResponse.token_type,
      expires_in: refreshResponse.expires_in,
      user: refreshResponse.user,
      doctorProfile: refreshResponse.doctorProfile,
      patientProfile: refreshResponse.patientProfile,
    };

    return loginResponse;
  } catch (error) {
    const errorContext = {
      hasRefreshToken: false,
      apiUrl: `/auth/refresh`,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      isNetworkError:
        error instanceof TypeError && error.message.includes('fetch'),
      timestamp: new Date().toISOString(),
    };

    let userFriendlyMessage =
      error instanceof Error ? error.message : 'Token refresh failed';

    if (errorContext.isNetworkError) {
      userFriendlyMessage = 'Network connection error during token refresh';
    } else if (!errorContext.hasRefreshToken) {
      userFriendlyMessage = 'No refresh token available for authentication';
    } else if (
      error instanceof Error &&
      (error.message.includes('401') ||
        error.message.includes('invalid') ||
        error.message.includes('expired'))
    ) {
      userFriendlyMessage = error.message;
    }
    // Re-throw with enhanced error message
    const enhancedError = new Error(userFriendlyMessage);
    enhancedError.name =
      error instanceof Error ? error.name : 'TokenRefreshError';
    throw enhancedError;
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  // Get current token for the logout request
  const token = await tokenStorage.getAccessToken();

  if (!token) {
    throw new Error('No authentication token available');
  }
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const accessToken = await tokenStorage.getAccessToken();
    const storedRefreshToken = await tokenStorage.getRefreshToken();

    if (!accessToken || !storedRefreshToken) {
      return false;
    }

    // Check if refresh token is expired
    const isRefreshExpired = await tokenStorage.isRefreshTokenExpired();
    if (isRefreshExpired) {
      logger.warn('Refresh token expired, logging out user', {
        component: 'MedicusUserService',
      });
      await tokenStorage.clearTokens();
      return false;
    }

    // Check if access token is expired
    if (isTokenExpired(accessToken)) {
      logger.info('Access token expired, attempting to refresh...', {
        component: 'MedicusUserService',
      });

      try {
        const refreshResponse = await refreshToken();

        await tokenStorage.storeTokens(
          refreshResponse.access_token,
          refreshResponse.refresh_token,
          refreshResponse.expires_in,
          7 // Default 7 days for refresh token
        );

        logger.info('Token refresh successful during auth check', {
          component: 'MedicusUserService',
        });
        return true;
      } catch (error) {
        logger.warn('Token refresh failed during auth check', {
          component: 'MedicusUserService',
          error: error instanceof Error ? error.message : String(error),
        });

        // Clear expired tokens
        await tokenStorage.clearTokens();
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Failed to check authentication status', error as Error, {
      component: 'MedicusUserService',
    });
    return false;
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<UserResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/me`);

    const user: UserResponse = await response.json();

    return user;
  } catch (error) {
    throw error;
  }
};
