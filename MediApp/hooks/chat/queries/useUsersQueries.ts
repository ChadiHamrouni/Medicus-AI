/**
 * TanStack Query hooks for users data fetching
 */

import type { SearchUsersParams, UsersSearchResponse } from '@/types';
import { searchUsers } from '@/services';
import { logger } from '@/utils';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '../../shared/useErrorHandling';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../../shared/useQueryConfig';

export const USER_QUERY_KEYS = QUERY_KEYS.users;

/**
 * Hook to search users with infinite scrolling
 */
export function useInfiniteUsersSearchQuery(
  baseParams: Omit<SearchUsersParams, 'page'>
) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.users.infinite(baseParams),
    queryFn: async ({ pageParam = 1 }) => {
      const params: SearchUsersParams = {
        ...baseParams,
        page: pageParam,
      };

      logger.debug('Fetching users page', {
        component: 'useInfiniteUsersSearch',
        params,
      });

      const response = await searchUsers(params);

      logger.info('Users page fetched successfully', {
        component: 'useInfiniteUsersSearch',
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
    enabled: !!baseParams.role,
    ...SHARED_QUERY_CONFIG.USERS,
  });
}

/**
 * Hook to search users with single page
 */
export function useUsersSearchQuery(params: SearchUsersParams) {
  return useQuery({
    queryKey: QUERY_KEYS.users.search(params),
    queryFn: async (): Promise<UsersSearchResponse> => {
      logger.debug('Fetching users', {
        component: 'useUsersSearch',
        params,
      });

      const response = await searchUsers(params);

      logger.info('Users fetched successfully', {
        component: 'useUsersSearch',
        resultCount: response.results?.length || 0,
        totalCount: response.count,
      });

      return response;
    },
    enabled: !!params.role,
    ...SHARED_QUERY_CONFIG.USERS,
  });
}

/**
 * Transform infinite query data to flat users array
 */
export function useUsersSearchData(
  infiniteQuery: ReturnType<typeof useInfiniteUsersSearchQuery>
) {
  const users =
    infiniteQuery.data?.pages.flatMap(page => page.results || []) || [];

  const totalCount = infiniteQuery.data?.pages[0]?.count || 0;

  // Convert error object to string for React compatibility
  const errorMessage = infiniteQuery.error
    ? infiniteQuery.error instanceof Error
      ? getErrorMessage(infiniteQuery.error)
      : String(infiniteQuery.error)
    : null;

  return {
    users,
    totalCount,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: errorMessage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    refetch: infiniteQuery.refetch,
  };
}
