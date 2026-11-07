import type { UseQueryOptions } from '@tanstack/react-query';
import type { PaginatedResponse } from './useGenericList';

export type QueryResult<T> = T;

/**
 * Factory for creating a list query configuration
 */
export function createListQueryConfig<T>(params: {
  queryKey: readonly unknown[];
  fetchFn: () => Promise<PaginatedResponse<T>>;
  config?: Partial<UseQueryOptions<PaginatedResponse<T>>>;
  errorMessage?: string;
}): UseQueryOptions<PaginatedResponse<T>> {
  return {
    queryKey: params.queryKey,
    queryFn: params.fetchFn,
    ...params.config,
    meta: {
      ...params.config?.meta,
      errorMessage: params.errorMessage,
    },
  };
}

/**
 * Factory for creating a detail query configuration
 */
export function createDetailQueryConfig<T>(params: {
  queryKey: readonly unknown[];
  fetchFn: () => Promise<T>;
  config?: Partial<UseQueryOptions<T>>;
  enabled?: boolean;
  errorMessage?: string;
}): UseQueryOptions<T> {
  return {
    queryKey: params.queryKey,
    queryFn: params.fetchFn,
    enabled: params.enabled !== undefined ? params.enabled : true,
    ...params.config,
    meta: {
      ...params.config?.meta,
      errorMessage: params.errorMessage,
    },
  };
}

/**
 * Factory for creating a search/filter query configuration
 */
export function createSearchQueryConfig<T>(params: {
  queryKey: readonly unknown[];
  fetchFn: () => Promise<PaginatedResponse<T>>;
  config?: Partial<UseQueryOptions<PaginatedResponse<T>>>;
  enabled?: boolean;
  errorMessage?: string;
}): UseQueryOptions<PaginatedResponse<T>> {
  return {
    queryKey: params.queryKey,
    queryFn: params.fetchFn,
    enabled: params.enabled !== undefined ? params.enabled : true,
    ...params.config,
    meta: {
      ...params.config?.meta,
      errorMessage: params.errorMessage,
    },
  };
}

/**
 * Factory for creating an infinite query configuration
 */
export function createInfiniteQueryConfig<T>(params: {
  queryKey: readonly unknown[];
  fetchFn: (_context: { pageParam: number }) => Promise<PaginatedResponse<T>>;
  config?: any;
  errorMessage?: string;
}) {
  return {
    queryKey: params.queryKey,
    queryFn: params.fetchFn,
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: PaginatedResponse<T>,
      allPages: PaginatedResponse<T>[]
    ) => {
      if (!lastPage.next) return undefined;
      return allPages.length + 1;
    },
    ...params.config,
    meta: {
      ...params.config?.meta,
      errorMessage: params.errorMessage,
    },
  };
}

/**
 * Helper to create a hook that uses a query config
 */
export function createQueryHook<TParams extends any[], TData>(
  configFactory: (..._args: TParams) => UseQueryOptions<TData>
) {
  return (...args: TParams) => {
    const config = configFactory(...args);
    return config;
  };
}
