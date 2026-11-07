/**
 * TanStack Query hooks for conversations using authenticated user ID only
 * No patient context or dependent filtering is applied
 */

import type { Conversation, ConversationsResponse } from '@/types';
import { fetchConversations } from '@/services';
import { logger } from '@/utils';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '../../shared/useErrorHandling';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../../shared/useQueryConfig';

/**
 * Fetch conversations with optional context filtering and assistant type
 */
export const fetchConversationsForAuthenticatedUser = async (
  page: number = 1,
  pageSize: number = 20,
  patientContextId?: number,
  doctorContextId?: number,
  assistant: 'mediaid' | 'medidoc' = 'mediaid'
): Promise<ConversationsResponse> => {
  try {
    logger.debug('Fetching conversations for authenticated user', {
      component: 'fetchConversationsForAuthenticatedUser',
      page,
      pageSize,
      patientContextId,
      doctorContextId,
      assistant,
    });

    // Fetch conversations with new API parameters
    const response = await fetchConversations({
      page,
      pageSize,
      patientContextId,
      doctorContextId,
      assistant,
    });

    logger.info('Conversations fetched for authenticated user', {
      component: 'fetchConversationsForAuthenticatedUser',
      originalCount: response.results.length,
      totalCount: response.count,
      assistant,
      hasPatientContext: !!patientContextId,
      hasDoctorContext: !!doctorContextId,
    });

    return response;
  } catch (error) {
    logger.error(
      'Error fetching conversations for authenticated user',
      error as Error,
      {
        component: 'fetchConversationsForAuthenticatedUser',
        page,
        pageSize,
        patientContextId,
        doctorContextId,
        assistant,
      }
    );
    throw error;
  }
};

/**
 * Hook to get conversations with infinite scrolling for authenticated user
 */
function useInfiniteConversationsQuery(
  pageSize: number = 20,
  patientContextId?: number,
  doctorContextId?: number,
  assistant: 'mediaid' | 'medidoc' = 'mediaid'
) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.conversations.infinite(pageSize, {
      patientContextId,
      doctorContextId,
      assistant,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      logger.debug('Fetching conversations page', {
        component: 'useInfiniteConversations',
        page: pageParam,
        pageSize,
        patientContextId,
        doctorContextId,
        assistant,
      });

      const response = await fetchConversationsForAuthenticatedUser(
        pageParam,
        pageSize,
        patientContextId,
        doctorContextId,
        assistant
      );

      logger.info('Conversations page fetched successfully', {
        component: 'useInfiniteConversations',
        page: pageParam,
        resultCount: response.results?.length || 0,
        totalCount: response.count,
        assistant,
      });

      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined;
      return allPages.length + 1;
    },
    ...SHARED_QUERY_CONFIG.CONVERSATIONS,
    enabled: assistant === 'mediaid' ? !!patientContextId : true,
  });
}

/**
 * Hook to get a single page of conversations for authenticated user
 */
function useConversationsPageQuery(
  page: number = 1,
  pageSize: number = 20,
  patientContextId?: number,
  doctorContextId?: number,
  assistant: 'mediaid' | 'medidoc' = 'mediaid'
) {
  return useQuery({
    queryKey: QUERY_KEYS.conversations.list(pageSize, {
      patientContextId,
      doctorContextId,
      assistant,
    }),
    queryFn: async (): Promise<ConversationsResponse> => {
      logger.debug('Fetching conversations', {
        component: 'useConversations',
        page,
        pageSize,
        patientContextId,
        doctorContextId,
        assistant,
      });

      const response = await fetchConversationsForAuthenticatedUser(
        page,
        pageSize,
        patientContextId,
        doctorContextId,
        assistant
      );

      logger.info('Conversations fetched successfully', {
        component: 'useConversations',
        page,
        resultCount: response.results?.length || 0,
        totalCount: response.count,
        assistant,
      });

      return response;
    },
    ...SHARED_QUERY_CONFIG.CONVERSATIONS,
    enabled: assistant === 'mediaid' ? !!patientContextId : true,
  });
}

/**
 * Transform infinite query data to flat conversations array
 */
function useConversationsData(
  infiniteQuery: ReturnType<typeof useInfiniteConversationsQuery>
) {
  const conversations: Conversation[] =
    infiniteQuery.data?.pages.flatMap((page: any) => page.results || []) || [];

  const totalCount = infiniteQuery.data?.pages[0]?.count || 0;

  // Convert error object to string for React compatibility
  const errorMessage = infiniteQuery.error
    ? infiniteQuery.error instanceof Error
      ? getErrorMessage(infiniteQuery.error)
      : String(infiniteQuery.error)
    : null;

  return {
    conversations,
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

/**
 * Hook that gets all conversations for the authenticated user with optional patient context
 */
export function useAuthenticatedUserConversations(
  pageSize: number = 20,
  patientContextId?: number,
  doctorContextId?: number,
  assistant: 'mediaid' | 'medidoc' = 'mediaid'
) {
  const infiniteQuery = useInfiniteConversationsQuery(
    pageSize,
    patientContextId,
    doctorContextId,
    assistant
  );
  const conversationsData = useConversationsData(infiniteQuery);

  logger.debug('Authenticated user conversations hook', {
    component: 'useAuthenticatedUserConversations',
    conversationCount: conversationsData.conversations.length,
    isLoading: conversationsData.isLoading,
    patientContextId,
    doctorContextId,
    assistant,
  });

  return {
    ...conversationsData,
  };
}
