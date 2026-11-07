import {
  useInfiniteQuery,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getErrorMessage } from './useErrorHandling';

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

export interface GenericListConfig<T, TParams = any> {
  /** Unique query key */
  queryKey: readonly unknown[];

  /** Function to fetch data */
  queryFn: (
    _params: TParams & { page?: number; pageSize?: number }
  ) => Promise<PaginatedResponse<T>>;

  /** Page size for pagination */
  pageSize?: number;

  /** Enable infinite scroll */
  infinite?: boolean;

  /** Additional query options */
  queryOptions?: Omit<
    UseQueryOptions<PaginatedResponse<T>>,
    'queryKey' | 'queryFn'
  >;
}

/**
 * Return type for useGenericList hook
 */
export interface GenericListReturn<T> {
  /** Flat array of all items */
  items: T[];

  /** Total count of items */
  totalCount: number;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  isError: boolean;

  /** Error message */
  error: string | null;

  /** Whether there are more pages */
  hasNextPage?: boolean;

  /** Whether currently fetching next page */
  isFetchingNextPage?: boolean;

  /** Function to load next page (infinite scroll) */
  fetchNextPage?: () => void;

  /** Function to refetch data */
  refetch: () => void;

  /** Whether currently refetching */
  isRefetching: boolean;
}

/**
 * Generic hook for list/paginated data
 * Supports both regular pagination and infinite scroll
 */
export function useGenericList<T, TParams = any>(
  config: GenericListConfig<T, TParams>
): GenericListReturn<T> {
  const {
    queryKey,
    queryFn,
    pageSize = 20,
    infinite = false,
    queryOptions = {},
  } = config;

  // Infinite scroll query
  const infiniteQuery = useInfiniteQuery({
    queryKey: [...queryKey, 'infinite', pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      return queryFn({ page: pageParam, pageSize } as TParams & {
        page?: number;
        pageSize?: number;
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined;
      return allPages.length + 1;
    },
    enabled: infinite,
    ...(queryOptions as any),
  });

  // Regular pagination query
  const regularQuery = useQuery({
    queryKey: [...queryKey, 'list', pageSize],
    queryFn: async () => {
      return queryFn({ page: 1, pageSize } as TParams & {
        page?: number;
        pageSize?: number;
      });
    },
    enabled: !infinite,
    ...queryOptions,
  });

  // Use appropriate query based on mode
  const query = infinite ? infiniteQuery : regularQuery;

  // Extract items from query data
  const items = useMemo(() => {
    if (infinite && infiniteQuery.data) {
      return infiniteQuery.data.pages.flatMap(
        (page: PaginatedResponse<T>) => page.results || []
      );
    }
    if (!infinite && regularQuery.data) {
      return regularQuery.data.results || [];
    }
    return [];
  }, [infinite, infiniteQuery.data, regularQuery.data]);

  // Extract total count
  const totalCount = useMemo(() => {
    if (infinite && infiniteQuery.data) {
      return infiniteQuery.data.pages[0]?.count || 0;
    }
    if (!infinite && regularQuery.data) {
      return regularQuery.data.count || 0;
    }
    return 0;
  }, [infinite, infiniteQuery.data, regularQuery.data]);

  // Error message
  const error = useMemo(() => {
    const queryError = query.error;
    if (!queryError) return null;
    return queryError instanceof Error
      ? getErrorMessage(queryError)
      : String(queryError);
  }, [query.error]);

  // Fetch next page callback
  const fetchNextPage = useCallback(() => {
    if (infinite && 'fetchNextPage' in infiniteQuery) {
      infiniteQuery.fetchNextPage();
    }
  }, [infinite, infiniteQuery]);

  return {
    items,
    totalCount,
    isLoading: query.isLoading,
    isError: query.isError,
    error,
    hasNextPage:
      infinite && 'hasNextPage' in infiniteQuery
        ? infiniteQuery.hasNextPage
        : undefined,
    isFetchingNextPage:
      infinite && 'isFetchingNextPage' in infiniteQuery
        ? infiniteQuery.isFetchingNextPage
        : undefined,
    fetchNextPage: infinite ? fetchNextPage : undefined,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/**
 * Helper to create a typed generic list hook
 */
export function createGenericListHook<T, TParams = any>(config: {
  baseQueryKey: readonly unknown[];
  queryFn: (
    _params: TParams & { page?: number; pageSize?: number }
  ) => Promise<PaginatedResponse<T>>;
  defaultPageSize?: number;
  queryConfig?: any;
}) {
  return (params?: TParams & { infinite?: boolean; pageSize?: number }) => {
    return useGenericList<T, TParams>({
      queryKey: [...config.baseQueryKey, params],
      queryFn: config.queryFn,
      pageSize: params?.pageSize || config.defaultPageSize || 20,
      infinite: params?.infinite || false,
      queryOptions: config.queryConfig,
    });
  };
}
