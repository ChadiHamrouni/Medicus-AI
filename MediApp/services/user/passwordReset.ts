import {
  PasswordChangeRequest,
  PasswordChangeResponse,
  PasswordResetCodeResponse,
  PasswordResetResponse,
} from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Change current user's password
 */
export const changePassword = async (
  passwordData: PasswordChangeRequest
): Promise<PasswordChangeResponse> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/me/password`, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to change password: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.detail || errorMessage;
      } catch {
        // If parsing fails, use the raw text
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result: PasswordChangeResponse = await response.json();

    logger.info('User password updated successfully', {
      component: 'MedicusUserService',
    });
    return result;
  } catch (error) {
    logger.error('Failed to change user password', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (
  email: string
): Promise<PasswordResetResponse> => {
  try {
    logger.info('Requesting password reset', {
      component: 'MedicusUserService',
      email,
    });

    const response = await fetch(
      `${API_BASE_URL}/auth/request-password-reset`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.detail ||
        errorData?.message ||
        `Password reset request failed: ${response.status}`;
      throw new Error(errorMessage);
    }

    const result: PasswordResetResponse = await response.json();
    logger.auditLog('password_reset_requested', '', { email });

    logger.info('Password reset request completed successfully', {
      component: 'MedicusUserService',
      email,
    });

    return result;
  } catch (error) {
    logger.error('Password reset request failed', error as Error, {
      component: 'MedicusUserService',
      email,
    });
    throw error;
  }
};

/**
 * Reset password with verification code
 */
export const resetPasswordWithCode = async (
  email: string,
  code: string,
  newPassword: string
): Promise<PasswordResetCodeResponse> => {
  try {
    logger.info('Resetting password with code', {
      component: 'MedicusUserService',
      email,
    });

    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.detail ||
        errorData?.message ||
        `Password reset failed: ${response.status}`;
      throw new Error(errorMessage);
    }

    const result: PasswordResetCodeResponse = await response.json();
    logger.auditLog('password_reset_completed', '', { email });

    logger.info('Password reset completed successfully', {
      component: 'MedicusUserService',
      email,
    });

    return result;
  } catch (error) {
    logger.error('Password reset with code failed', error as Error, {
      component: 'MedicusUserService',
      email,
    });
    throw error;
  }
};
