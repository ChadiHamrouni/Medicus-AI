import { LoginResponse } from '@/types/auth';
import { logger, tokenStorage, userStorage } from '@/utils';
import { notificationService } from '@/services/notifications/notifications';
import { Alert } from 'react-native';
import { updateGlobalAuthState } from './authState';
import { Router } from 'expo-router';

export const handleAuthSuccess = async (
  loginResponse: LoginResponse,
  updateAuthState: typeof updateGlobalAuthState
) => {
  logger.info('Updating auth state with user data and profile data', {
    component: 'useAuth',
    userId: String(loginResponse.user.id),
    role: loginResponse.user.role,
    hasDoctorProfile: !!loginResponse.doctorProfile,
    hasPatientProfile: !!loginResponse.patientProfile,
    doctorCountryName: loginResponse.doctorProfile?.country_name,
    patientCountryName: loginResponse.patientProfile?.country_name,
  });

  // Persist to secure storage
  await tokenStorage.setAccessToken(loginResponse.access_token);
  await tokenStorage.setRefreshToken(loginResponse.refresh_token);
  await userStorage.setUser(loginResponse.user);

  updateAuthState({
    isAuthenticated: true,
    user: loginResponse.user,
    token: loginResponse.access_token,
    refreshToken: loginResponse.refresh_token,
    // Store profile data from materialized views
    doctorProfile: loginResponse.doctorProfile || null,
    patientProfile: loginResponse.patientProfile || null,
    error: null,
    // Keep loading true until navigation completes
  });
};

export const performLogin = async (
  identifier: string,
  password: string,
  loginMutation: any,
  updateAuthState: typeof updateGlobalAuthState,
  clearError: () => void,
  handleAuthError: (error: Error) => void,
  router: Router,
  logout: () => Promise<void>
) => {
  try {
    clearError();

    if (!identifier?.trim()) {
      throw new Error('Email or phone number is required');
    }

    if (!password?.trim()) {
      throw new Error('Password is required');
    }

    updateAuthState({ isLoading: true, error: null });

    logger.info('Attempting login', {
      component: 'useAuth',
      identifier: identifier.includes('@')
        ? identifier.replace(/(.{2}).*(@.*)/, '$1***$2')
        : identifier.replace(/.{4}$/, '****'),
    });

    const loginResponse = await loginMutation.mutateAsync({
      identifier: identifier.trim().toLowerCase(),
      password,
    });

    // Handle auth success and ensure state is updated immediately
    await handleAuthSuccess(loginResponse, updateAuthState);

    // Extract user data from patient profile if available (with null safety)
    if (loginResponse.user.role === 'patient' && loginResponse.patientProfile) {
      const profile = loginResponse.patientProfile;
      const enrichedUser = {
        ...loginResponse.user,
        // Only override if patient profile has valid (non-null) values
        email: profile.email || loginResponse.user.email,
        phone_number: profile.phone_number || loginResponse.user.phone_number,
        display_name:
          profile.display_name ||
          profile.full_name ||
          loginResponse.user.display_name,
        first_name: profile.first_name || loginResponse.user.first_name,
        last_name: profile.last_name || loginResponse.user.last_name,
        account_status:
          profile.account_status || loginResponse.user.account_status,
        is_verified:
          profile.is_verified !== undefined
            ? profile.is_verified
            : loginResponse.user.is_verified,
      };
      updateAuthState({ user: enrichedUser });
      logger.info('User data extracted from patient profile', {
        component: 'useAuth',
        userId: String(enrichedUser.id),
        hasDisplayName: !!enrichedUser.display_name,
      });
    }

    logger.auditLog('user_login_completed', String(loginResponse.user.id), {
      identifier: identifier.includes('@')
        ? identifier.replace(/(.{2}).*(@.*)/, '$1***$2')
        : identifier.replace(/.{4}$/, '****'),
      role: loginResponse.user.role,
    });

    // Register push notification token with backend (non-blocking)
    notificationService.registerTokenWithBackend().catch(error => {
      logger.warn('Failed to register push token - will retry later', {
        component: 'useAuth',
        error: (error as Error).message,
      });
    });

    // Handle different account statuses after state update
    if (loginResponse.user.account_status === 'pending') {
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

    if (loginResponse.user.account_status === 'suspended') {
      Alert.alert(
        'Account Suspended',
        'Your account has been suspended. Please contact support for assistance.',
        [{ text: 'OK' }]
      );
      await logout();
      return;
    }

    if (loginResponse.user.account_status === 'inactive') {
      Alert.alert(
        'Account Inactive',
        'Your account is currently inactive. Please contact support for assistance.',
        [{ text: 'OK' }]
      );
      await logout();
      return;
    }

    router.replace('/tabs/chats');

    // Set loading to false after navigation is initiated
    updateAuthState({ isLoading: false });
  } catch (error) {
    const authError = error as Error;

    handleAuthError(authError);

    logger.error('Login failed', authError, {
      component: 'useAuth',
      identifier: identifier.includes('@')
        ? identifier.replace(/(.{2}).*(@.*)/, '$1***$2')
        : identifier.replace(/.{4}$/, '****'),
    });

    updateAuthState({ isLoading: false });
  }
};
