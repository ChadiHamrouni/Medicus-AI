/**
 * Users search hook - combines query, debouncing, and transformation
 */

import type { SearchUsersParams } from '@/types';
import { searchUsers } from '@/services';
import { UserRole, type UserResponse } from '@/types/auth';
import type { User } from '@/types/user';
import { logger } from '@/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useErrorHandler } from '../shared/useErrorHandling';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../shared/useQueryConfig';

interface UseUsersSearchOptions {
  role?: UserRole;
  pageSize?: number;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseUsersSearchReturn {
  searchQuery: string;
  setSearchQuery: (_query: string) => void;
  users: User[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
  // Advanced state
  isInitialLoading: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
}

export function useUsersSearch({
  role = UserRole.DOCTOR,
  pageSize = 20,
  debounceMs = 500,
  enabled = true,
}: UseUsersSearchOptions = {}): UseUsersSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { logError, getDisplayError } = useErrorHandler({
    component: 'useUsersSearch',
    context: { role, query: debouncedQuery.substring(0, 20) },
    showUserFriendlyMessage: true,
  });

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const searchParams: Omit<SearchUsersParams, 'page'> = {
    query: debouncedQuery,
    role,
    page_size: pageSize,
  };

  const infiniteQuery = useInfiniteQuery({
    queryKey: QUERY_KEYS.users.infinite(searchParams),
    queryFn: async ({ pageParam = 1 }) => {
      const params: SearchUsersParams = {
        ...searchParams,
        page: pageParam,
      };

      logger.debug('Fetching users page', {
        component: 'useUsersSearch',
        params,
      });

      const response = await searchUsers(params);

      logger.info('Users page fetched successfully', {
        component: 'useUsersSearch',
        page: pageParam,
        resultCount: response.results?.length || 0,
        totalCount: response.count,
      });

      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined;
      return allPages.length + 1;
    },
    enabled: enabled && !!role,
    ...SHARED_QUERY_CONFIG.USERS,
  });

  // Transform users data
  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const transformApiUser = useCallback(
    (apiUser: UserResponse): User => {
      const displayName =
        apiUser.display_name ||
        apiUser.full_name ||
        [apiUser.first_name, apiUser.last_name].filter(Boolean).join(' ') ||
        apiUser.email;

      return {
        id: apiUser.id.toString(),
        identity: apiUser.email,
        displayName,
        avatar: getInitials(displayName),
        type: apiUser.role,
      };
    },
    [getInitials]
  );

  const users = useMemo(() => {
    const allUsers =
      infiniteQuery.data?.pages.flatMap(page => page.results || []) || [];
    return allUsers.map(transformApiUser);
  }, [infiniteQuery.data, transformApiUser]);

  const errorMessage = infiniteQuery.error
    ? getDisplayError(infiniteQuery.error as Error)
    : null;

  // Actions
  const loadMore = useCallback(async () => {
    if (
      infiniteQuery.hasNextPage &&
      !infiniteQuery.isFetchingNextPage &&
      !infiniteQuery.isLoading
    ) {
      try {
        await infiniteQuery.fetchNextPage();
      } catch (error) {
        logError(error as Error, { action: 'loadMore' });
      }
    }
  }, [infiniteQuery, logError]);

  const refetch = useCallback(async () => {
    try {
      await infiniteQuery.refetch();
    } catch (error) {
      logError(error as Error, { action: 'refetch' });
    }
  }, [infiniteQuery, logError]);

  const clearError = useCallback(() => {
    // Error is automatically cleared on successful refetch by TanStack Query
    refetch();
  }, [refetch]);

  return {
    searchQuery,
    setSearchQuery,
    users,
    isLoading: infiniteQuery.isLoading,
    error: errorMessage,
    hasMore: infiniteQuery.hasNextPage || false,
    loadMore,
    refetch,
    clearError,
    // Advanced state
    isInitialLoading:
      infiniteQuery.isLoading && !infiniteQuery.isFetchingNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isRefetching: infiniteQuery.isRefetching,
  };
}
