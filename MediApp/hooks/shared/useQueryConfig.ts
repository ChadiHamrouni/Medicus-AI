/**
 * Shared TanStack Query configuration for consistent behavior across hooks
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { shouldRetryError } from './useErrorHandling';

/**
 * Standard cache durations
 */
export const CACHE_TIMES = {
  SHORT: 30 * 1000, // 30 seconds - frequently changing data
  MEDIUM: 2 * 60 * 1000, // 2 minutes - moderately changing data
  LONG: 5 * 60 * 1000, // 5 minutes - slowly changing data
  VERY_LONG: 15 * 60 * 1000, // 15 minutes - rarely changing data
} as const;

export const GC_TIMES = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 10 * 60 * 1000, // 10 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
} as const;

/**
 * Standardized query configurations by data type
 */
export const SHARED_QUERY_CONFIG = {
  // Conversations - moderately fresh
  CONVERSATIONS: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 2),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  },

  // Messages - very fresh (real-time updates)
  MESSAGES: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 2),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 3000),
  },

  // Users - moderately fresh
  USERS: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 2),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 3000),
  },

  // Dependents - relatively stable
  DEPENDENTS: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.MEDIUM,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 3),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  },

  // Patient Profile - relatively stable
  PATIENT_PROFILE: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.MEDIUM,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 3),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  },

  // Doctor Profile - stable
  DOCTOR_PROFILE: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.LONG,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 3),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  },

  // Specialties - very stable (rarely changes)
  SPECIALTIES: {
    staleTime: CACHE_TIMES.VERY_LONG,
    gcTime: GC_TIMES.LONG,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 3),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  },

  // Countries - very stable
  COUNTRIES: {
    staleTime: CACHE_TIMES.VERY_LONG,
    gcTime: GC_TIMES.LONG,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 3),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  },

  // Static/Reference Data - extremely stable
  STATIC: {
    staleTime: Infinity, // Never goes stale
    gcTime: GC_TIMES.LONG,
    retry: (failureCount: number, error: any) =>
      shouldRetryError(error, failureCount, 3),
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 5000),
  },
} as const;

// Centralized query keys for better cache management
export const QUERY_KEYS = {
  // Conversations
  conversations: {
    all: ['conversations'] as const,
    lists: () => [...QUERY_KEYS.conversations.all, 'list'] as const,
    list: (pageSize: number, filters?: Record<string, any>) =>
      [...QUERY_KEYS.conversations.lists(), pageSize, filters] as const,
    infinite: (pageSize: number, filters?: Record<string, any>) =>
      [...QUERY_KEYS.conversations.all, 'infinite', pageSize, filters] as const,
    detail: (id: string) =>
      [...QUERY_KEYS.conversations.all, 'detail', id] as const,
  },

  // Messages
  messages: {
    all: ['messages'] as const,
    conversation: (convoId: string) =>
      [...QUERY_KEYS.messages.all, 'conversation', convoId] as const,
    infinite: (convoId: string, pageSize: number) =>
      [
        ...QUERY_KEYS.messages.conversation(convoId),
        'infinite',
        pageSize,
      ] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    searches: () => [...QUERY_KEYS.users.all, 'search'] as const,
    search: (params: any) => [...QUERY_KEYS.users.searches(), params] as const,
    infinite: (params: any) =>
      [...QUERY_KEYS.users.all, 'infinite', params] as const,
    current: () => [...QUERY_KEYS.users.all, 'current'] as const,
  },

  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...QUERY_KEYS.auth.all, 'user'] as const,
    status: () => [...QUERY_KEYS.auth.all, 'status'] as const,
  },

  // Dependents
  dependents: {
    all: ['dependents'] as const,
    lists: () => [...QUERY_KEYS.dependents.all, 'list'] as const,
    list: (includeMain: boolean) =>
      [...QUERY_KEYS.dependents.lists(), { includeMain }] as const,
    details: () => [...QUERY_KEYS.dependents.all, 'detail'] as const,
    detail: (id: number) => [...QUERY_KEYS.dependents.details(), id] as const,
    contexts: () => [...QUERY_KEYS.dependents.all, 'contexts'] as const,
  },

  // Patient Profile
  patientProfile: {
    all: ['patientProfile'] as const,
    detail: (id: number) => [...QUERY_KEYS.patientProfile.all, id] as const,
    current: () => [...QUERY_KEYS.patientProfile.all, 'current'] as const,
    profile: () => [...QUERY_KEYS.patientProfile.all, 'current'] as const,
    patientById: (id: number) =>
      [...QUERY_KEYS.patientProfile.all, 'by-id', id] as const,
  },

  // Doctor Profile
  doctorProfile: {
    all: ['doctorProfile'] as const,
    detail: (id: number) => [...QUERY_KEYS.doctorProfile.all, id] as const,
    current: () => [...QUERY_KEYS.doctorProfile.all, 'current'] as const,
    profile: () => [...QUERY_KEYS.doctorProfile.all, 'profile'] as const,
    specialties: () =>
      [...QUERY_KEYS.doctorProfile.all, 'specialties'] as const,
    specialtiesPublic: () => ['public', 'specialties'] as const,
    languages: () => [...QUERY_KEYS.doctorProfile.all, 'languages'] as const,
    countries: () => [...QUERY_KEYS.doctorProfile.all, 'countries'] as const,
  },

  // Countries
  countries: () => ['countries'] as const,
} as const;

/**
 * Hook for common query operations
 */
export function useQueryOperations() {
  const queryClient = useQueryClient();

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
  }, [queryClient]);

  const invalidateMessages = useCallback(
    (convoId?: string) => {
      if (convoId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.messages.conversation(convoId),
        });
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.all });
      }
    },
    [queryClient]
  );

  const invalidateUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.all });
  }, [queryClient]);

  const invalidateDependents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dependents.all });
  }, [queryClient]);

  const invalidatePatientProfile = useCallback(
    (patientId?: number) => {
      if (patientId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.patientProfile.detail(patientId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.patientProfile.all,
        });
      }
    },
    [queryClient]
  );

  const invalidateDoctorProfile = useCallback(
    (doctorId?: number) => {
      if (doctorId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.doctorProfile.detail(doctorId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.doctorProfile.all,
        });
      }
    },
    [queryClient]
  );

  const clearAllCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  return {
    invalidateConversations,
    invalidateMessages,
    invalidateUsers,
    invalidateDependents,
    invalidatePatientProfile,
    invalidateDoctorProfile,
    clearAllCache,
    queryClient,
  };
}
