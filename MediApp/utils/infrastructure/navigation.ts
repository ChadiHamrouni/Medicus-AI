import { router } from 'expo-router';
import { UserRole } from '@/types/auth';

/**
 * Universal navigation utility for consistent back navigation across the app
 */

export interface NavigationOptions {
  fallbackRoute?: string;
  userRole?: UserRole;
}

/**
 * Navigates to the previous page with intelligent fallback routing
 * @param options - Navigation options including fallback route and user role
 */
export const goToPreviousPage = (options: NavigationOptions = {}) => {
  const { fallbackRoute, userRole } = options;

  // Try to go back to previous page first
  if (router.canGoBack()) {
    router.back();
    return;
  }

  // If fallback route is explicitly provided, use it
  if (fallbackRoute) {
    router.push(fallbackRoute as any);
    return;
  }

  // Smart fallback based on user role
  if (userRole === UserRole.DOCTOR) {
    router.push('/tabs/doctor');
    return;
  }

  if (userRole === UserRole.PATIENT) {
    router.push('/tabs/patients');
    return;
  }

  // Default fallback for doctor profiles (most common use case)
  router.push('/tabs/doctor');
};

/**
 * Specific navigation helpers for common use cases
 */

export const goToDoctorProfile = () => {
  goToPreviousPage({
    fallbackRoute: '/tabs/doctor',
    userRole: UserRole.DOCTOR,
  });
};

export const goToPatientProfile = () => {
  goToPreviousPage({
    fallbackRoute: '/tabs/patients',
    userRole: UserRole.PATIENT,
  });
};

/**
 * Navigation helper for profile pages with context awareness
 * @param currentPage - The current page identifier for debugging
 * @param userRole - The user role for smart fallback
 */
export const goToPreviousPageFromProfile = (
  currentPage: string,
  userRole?: UserRole
) => {
  goToPreviousPage({
    userRole: userRole || UserRole.DOCTOR, // Default to doctor for backward compatibility
  });
};
