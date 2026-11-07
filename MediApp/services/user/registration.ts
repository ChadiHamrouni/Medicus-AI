/**
 * Registration and email verification service
 */

import {
  EmailVerificationCodeRequest,
  EmailVerificationRequest,
  EmailVerificationResponse,
  TokenResponse,
  UserRegisterRequest,
} from '@/types/auth';
import { env, logger } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Register a new user
 */
export const registerUser = async (
  userData: UserRegisterRequest
): Promise<TokenResponse> => {
  try {
    logger.info('Attempting user registration', {
      component: 'RegistrationService',
      email: userData.email,
      role: userData.role,
    });

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.detail ||
        errorData?.message ||
        `Registration failed: ${response.status}`;

      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.statusCode = response.status;
      error.response = { status: response.status, data: errorData };

      throw error;
    }

    const registrationData: TokenResponse = await response.json();

    logger.auditLog(
      'user_registration_successful',
      registrationData.user.id.toString(),
      {
        email: userData.email,
        role: userData.role,
      }
    );

    return registrationData;
  } catch (error) {
    logger.error('Registration failed', error as Error, {
      component: 'RegistrationService',
      email: userData.email,
    });
    throw error;
  }
};

/**
 * Send verification code to email
 */
export const sendVerificationCode = async (
  request: EmailVerificationRequest
): Promise<EmailVerificationResponse> => {
  try {
    logger.info('Sending verification code', {
      component: 'RegistrationService',
      email: request.email,
    });

    const response = await fetch(
      `${API_BASE_URL}/auth/send-verification-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.detail ||
        errorData?.message ||
        `Failed to send verification code: ${response.status}`;

      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.statusCode = response.status;
      error.response = { status: response.status, data: errorData };

      throw error;
    }

    const result: EmailVerificationResponse = await response.json();

    logger.info('Verification code sent successfully', {
      component: 'RegistrationService',
      email: request.email,
    });

    return result;
  } catch (error) {
    logger.error('Failed to send verification code', error as Error, {
      component: 'RegistrationService',
      email: request.email,
    });
    throw error;
  }
};

/**
 * Verify email with code
 */
export const verifyEmailCode = async (
  request: EmailVerificationCodeRequest
): Promise<EmailVerificationResponse> => {
  try {
    logger.info('Verifying email code', {
      component: 'RegistrationService',
      email: request.email,
    });

    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.detail ||
        errorData?.message ||
        `Email verification failed: ${response.status}`;

      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.statusCode = response.status;
      error.response = { status: response.status, data: errorData };

      throw error;
    }

    const result: EmailVerificationResponse = await response.json();

    logger.auditLog('email_verification_successful', '', {
      email: request.email,
    });

    return result;
  } catch (error) {
    logger.error('Email verification failed', error as Error, {
      component: 'RegistrationService',
      email: request.email,
    });
    throw error;
  }
};
