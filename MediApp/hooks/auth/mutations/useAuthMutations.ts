/**
 * TanStack Query mutation hooks for user authentication
 */

import {
  changePassword,
  deleteCurrentUser,
  login,
  logout,
  refreshToken as refreshTokenFn,
  requestPasswordReset,
  resetPasswordWithCode,
  updateCurrentUser,
  registerUser,
  sendVerificationCode,
  verifyEmailCode,
} from '@/services/user';
import type {
  EmailVerificationCodeRequest,
  EmailVerificationRequest,
  EmailVerificationResponse,
  LoginRequest,
  LoginResponse,
  PasswordChangeRequest,
  PasswordChangeResponse,
  PasswordResetCodeRequest,
  PasswordResetCodeResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  RefreshResponse,
  TokenResponse,
  UserRegisterRequest,
} from '@/types/auth';
import { tokenStorage, logger } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { syncUserRoleFromAuth } from '@/contexts/AppContext';

/**
 * Hook to login user
 */
export function useLoginMutation() {
  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<LoginResponse> => {
      // console.log('🎯 [useLoginMutation] MUTATION FUNCTION CALLED');
      // console.log('🎯 [useLoginMutation] Credentials:', {
      //   email: credentials.email?.replace(/(.{2}).*(@.*)/, "$1***$2"),
      //   passwordLength: credentials.password?.length,
      //   hasEmail: !!credentials.email,
      //   hasPassword: !!credentials.password
      // });

      logger.info('Login attempt started', {
        component: 'useLogin',
        identifier: credentials.identifier,
      });

      // console.log('🎯 [useLoginMutation] Calling medicusUser.login()...');
      // const loginStartTime = Date.now();

      const response = await login(
        credentials.identifier,
        credentials.password
      );

      // const loginEndTime = Date.now();
      // console.log('🎯 [useLoginMutation] medicusUser.login() completed in:', loginEndTime - loginStartTime, 'ms');
      // console.log('🎯 [useLoginMutation] FULL API RESPONSE:', JSON.stringify(response, null, 2));
      // console.log('🎯 [useLoginMutation] Response summary:', {
      //   hasAccessToken: !!response.access_token,
      //   hasUser: !!response.user,
      //   userId: response.user?.id,
      //   userEmail: response.user?.email?.replace(/(.{2}).*(@.*)/, "$1***$2")
      // });

      // console.log('🎯 [useLoginMutation] MUTATION FUNCTION COMPLETED');
      return response;
    },
    onSuccess: async data => {
      // Store tokens with expiration info
      console.log('🎯 [useLoginMutation] onSuccess triggered');
      console.log('🎯 [useLoginMutation] data:', {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        expiresIn: data.expires_in,
        hasUser: !!data.user,
      });

      try {
        await tokenStorage.storeTokens(
          data.access_token,
          data.refresh_token,
          data.expires_in,
          7 // Default 7 days for refresh token expiry
        );
        console.log('🎯 [useLoginMutation] Tokens stored successfully');
      } catch (tokenError) {
        console.error('🚨 [useLoginMutation] Token storage failed (will retry):', tokenError);
        // Don't throw - the fallback mechanism in secure_storage should handle this
        // If it still fails, log it but allow login to continue
        logger.warn('Token storage encountered an issue but continuing with login', tokenError as Error);
      }

      // Sync user role with AppContext based on API response
      try {
        // Static import: a dynamic import() here makes Metro serve a lazy chunk in
        // development, which triggers a full JS reload in the middle of login.
        {
          await syncUserRoleFromAuth(
            data.user.role as 'doctor' | 'patient'
          );
          logger.info('Synced user role with AppContext', {
            component: 'useLoginMutation',
            apiRole: data.user.role,
          });
        }
      } catch (error) {
        logger.warn('Could not sync user role with AppContext', error as Error);
      }

      logger.auditLog('user_login_completed', String(data.user.id), {
        email: data.user.email
          ? data.user.email.replace(/(.{2}).*(@.*)/, '$1***$2')
          : 'N/A',
        role: data.user.role,
      });

      if (data.user.account_status === 'pending') {
        Alert.alert(
          'Account Verification Required',
          'Please verify your account before continuing.',
          [
            {
              text: 'Verify Now',
              onPress: () => router.replace('/(SignUp)/VerificationScreen'),
            },
          ]
        );
        return;
      }

      if (data.user.account_status === 'suspended') {
        Alert.alert(
          'Account Suspended',
          'Your account has been suspended. Please contact support for assistance.',
          [{ text: 'OK' }]
        );
        await tokenStorage.clearTokens();
        return;
      }

      if (data.user.account_status === 'inactive') {
        Alert.alert(
          'Account Inactive',
          'Your account is currently inactive. Please contact support for assistance.',
          [{ text: 'OK' }]
        );
        await tokenStorage.clearTokens();
        return;
      }

      logger.info('Login mutation completed successfully', {
        component: 'useLogin',
        userId: data.user?.id?.toString(),
      });
    },
    onError: error => {
      console.log('🚨 [useLoginMutation] onError triggered');
      console.log(
        '🚨 [useLoginMutation] Error object:',
        JSON.stringify(error, null, 2)
      );
      console.log('🚨 [useLoginMutation] Error message:', error?.message);
      console.log('🚨 [useLoginMutation] Error stack:', error?.stack);

      logger.error('Login failed', error as Error, {
        component: 'useLogin',
        errorMessage: error?.message,
        errorDetails: JSON.stringify(error),
      });
    },
    retry: false,
  });
}

/**
 * Hook to register user
 */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (
      userData: UserRegisterRequest
    ): Promise<TokenResponse> => {
      logger.info('Registration attempt started', {
        component: 'useRegister',
        email: userData.email,
        role: userData.role,
      });

      const response = await registerUser(userData);
      return response;
    },
    onSuccess: async data => {
      logger.info('Registration mutation completed successfully', {
        component: 'useRegister',
        userId: data.user?.id?.toString(),
      });
    },
    onError: (error: any) => {
      const errorContext = {
        component: 'useRegister',
        message: error?.message || 'Unknown error',
        name: error?.name,
        statusCode: error?.status || error?.statusCode,
        ...(error?.response && {
          response: {
            status: error.response.status,
            data: error.response.data,
          },
        }),
      };

      logger.error('Registration failed', error as Error, errorContext);
    },
    retry: false,
  });
}

/**
 * Hook to logout user
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      logger.info('Logout attempt started', {
        component: 'useLogout',
      });

      const token = await tokenStorage.getAccessToken();
      if (token) {
        try {
          await logout();
        } catch (error) {
          logger.warn(
            'Logout server call failed, continuing with local logout',
            error as Error
          );
        }
      }

      await tokenStorage.clearTokens();

      logger.info('Logout completed successfully', {
        component: 'useLogout',
      });
    },
    onSuccess: () => {
      queryClient.clear();

      logger.info('Logout mutation completed successfully', {
        component: 'useLogout',
      });
    },
    onError: error => {
      logger.error('Logout failed', error as Error, {
        component: 'useLogout',
      });
    },
    retry: false,
  });
}

/**
 * Hook to refresh token
 */
export function useRefreshTokenMutation() {
  return useMutation({
    mutationFn: async (): Promise<RefreshResponse> => {
      logger.info('Token refresh attempt started', {
        component: 'useRefreshToken',
      });

      const response = await refreshTokenFn();

      return response;
    },
    onSuccess: async data => {
      await tokenStorage.storeTokens(
        data.access_token,
        data.refresh_token,
        data.expires_in,
        7 // Default 7 days for refresh token expiry
      );

      logger.info('Refresh token mutation completed successfully', {
        component: 'useRefreshToken',
      });
    },
    onError: async error => {
      logger.error('Token refresh failed', error as Error, {
        component: 'useRefreshToken',
      });

      await tokenStorage.clearTokens();
      router.replace('/(SignIn)/SignInScreen');
    },
    retry: false,
  });
}

/**
 * Hook to change user password
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (
      passwordData: PasswordChangeRequest
    ): Promise<PasswordChangeResponse> => {
      logger.info('Password change attempt started', {
        component: 'useChangePassword',
      });

      const response = await changePassword(passwordData);

      return response;
    },
    onSuccess: data => {
      logger.info('Password change mutation completed successfully', {
        component: 'useChangePassword',
        message: data.message,
      });
    },
    onError: error => {
      logger.error('Password change failed', error as Error, {
        component: 'useChangePassword',
      });
    },
    retry: false,
  });
}

/**
 * Hook to send email verification code
 */
export function useSendVerificationCodeMutation() {
  return useMutation({
    mutationFn: async (
      request: EmailVerificationRequest
    ): Promise<EmailVerificationResponse> => {
      logger.info('Sending verification code', {
        component: 'useSendVerificationCode',
        email: request.email,
      });

      const response = await sendVerificationCode(request);
      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Verification code sent successfully', {
        component: 'useSendVerificationCode',
        email: variables.email,
        message: data.message,
      });
    },
    onError: (error, variables) => {
      logger.error('Failed to send verification code', error as Error, {
        component: 'useSendVerificationCode',
        email: variables.email,
      });
    },
    retry: false,
  });
}

/**
 * Hook to verify email with code
 */
export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: async (
      request: EmailVerificationCodeRequest
    ): Promise<EmailVerificationResponse> => {
      logger.info('Verifying email code', {
        component: 'useVerifyEmail',
        email: request.email,
      });

      const response = await verifyEmailCode(request);
      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Email verification completed successfully', {
        component: 'useVerifyEmail',
        email: variables.email,
        message: data.message,
      });
    },
    onError: (error, variables) => {
      logger.error('Email verification failed', error as Error, {
        component: 'useVerifyEmail',
        email: variables.email,
      });
    },
    retry: false,
  });
}

/**
 * Hook to request password reset
 */
export function useRequestPasswordResetMutation() {
  return useMutation({
    mutationFn: async (
      request: PasswordResetRequest
    ): Promise<PasswordResetResponse> => {
      logger.info('Requesting password reset', {
        component: 'useRequestPasswordReset',
        email: request.email,
      });

      const response = await requestPasswordReset(request.email);
      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Password reset request sent successfully', {
        component: 'useRequestPasswordReset',
        email: variables.email,
        message: data.message,
      });
    },
    onError: (error, variables) => {
      logger.error('Password reset request failed', error as Error, {
        component: 'useRequestPasswordReset',
        email: variables.email,
      });
    },
    retry: false,
  });
}

/**
 * Hook to reset password with verification code
 */
export function useResetPasswordWithCodeMutation() {
  return useMutation({
    mutationFn: async (
      request: PasswordResetCodeRequest
    ): Promise<PasswordResetCodeResponse> => {
      logger.info('Resetting password with code', {
        component: 'useResetPasswordWithCode',
        email: request.email,
      });

      const response = await resetPasswordWithCode(
        request.email,
        request.code,
        request.new_password
      );
      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Password reset completed successfully', {
        component: 'useResetPasswordWithCode',
        email: variables.email,
        message: data.message,
      });
    },
    onError: (error, variables) => {
      logger.error('Password reset with code failed', error as Error, {
        component: 'useResetPasswordWithCode',
        email: variables.email,
      });
    },
    retry: false,
  });
}

/**
 * Hook to delete current user account
 */
export function useDeleteUserMutation() {
  return useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      logger.info('Deleting current user account', {
        component: 'useDeleteUser',
      });

      const response = await deleteCurrentUser();
      return response;
    },
    onSuccess: data => {
      logger.info('User account deleted successfully', {
        component: 'useDeleteUser',
        message: data.message,
      });
    },
    onError: error => {
      logger.error('Account deletion failed', error as Error, {
        component: 'useDeleteUser',
      });
    },
    retry: false,
  });
}

/**
 * Hook to update current user information
 */
export function useUpdateCurrentUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: {
      first_name?: string;
      last_name?: string;
      phone?: string;
    }): Promise<any> => {
      logger.info('Updating current user information', {
        component: 'useUpdateCurrentUser',
        updateFields: Object.keys(updateData),
      });

      const response = await updateCurrentUser(updateData);
      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('User information updated successfully', {
        component: 'useUpdateCurrentUser',
        updatedFields: Object.keys(variables),
      });

      // Invalidate relevant queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['patient'] });
    },
    onError: (error, variables) => {
      logger.error('Failed to update user information', error as Error, {
        component: 'useUpdateCurrentUser',
        attemptedFields: Object.keys(variables),
      });
    },
    retry: false,
  });
}
