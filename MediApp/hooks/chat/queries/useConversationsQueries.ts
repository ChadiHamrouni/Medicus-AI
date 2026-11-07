/**
 * TanStack Query hooks for conversations data fetching
 */

import type { Conversation, ConversationContext, ConversationsResponse } from '@/types';
import { fetchConversations, fetchConversationContext } from '@/services';
import { logger } from '@/utils';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '../../shared/useErrorHandling';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../../shared/useQueryConfig';

export const CONVERSATION_QUERY_KEYS = QUERY_KEYS.conversations;

/**
 * Hook to get conversations with infinite scrolling
 */
function useInfiniteConversationsQuery(
  pageSize: number = 20,
  patientContextId?: number,
  doctorContextId?: number
) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.conversations.infinite(pageSize, {
      patientContextId,
      doctorContextId,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      logger.debug('Fetching conversations page', {
        component: 'useInfiniteConversations',
        page: pageParam,
        pageSize,
        patientContextId,
        doctorContextId,
      });

      const response = await fetchConversations({
        page: pageParam,
        pageSize,
        patientContextId,
        doctorContextId,
      });

      logger.info('Conversations page fetched successfully', {
        component: 'useInfiniteConversations',
        page: pageParam,
        resultCount: response.results?.length || 0,
        totalCount: response.count,
        patientContextId,
      });

      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined;
      return allPages.length + 1;
    },
    ...SHARED_QUERY_CONFIG.CONVERSATIONS,
  });
}

/**
 * Hook to get a single page of conversations
 */
function useConversationsPageQuery(
  page: number = 1,
  pageSize: number = 20,
  patientContextId?: number,
  doctorContextId?: number
) {
  return useQuery({
    queryKey: QUERY_KEYS.conversations.list(pageSize, {
      patientContextId,
      doctorContextId,
    }),
    queryFn: async (): Promise<ConversationsResponse> => {
      logger.debug('Fetching conversations', {
        component: 'useConversations',
        page,
        pageSize,
        patientContextId,
        doctorContextId,
      });

      const response = await fetchConversations({
        page,
        pageSize,
        patientContextId,
        doctorContextId,
      });

      logger.info('Conversations fetched successfully', {
        component: 'useConversations',
        page,
        resultCount: response.results?.length || 0,
        totalCount: response.count,
        patientContextId,
      });

      return response;
    },
    ...SHARED_QUERY_CONFIG.CONVERSATIONS,
  });
}

/**
 * Transform infinite query data to flat conversations array
 */
function useConversationsData(
  infiniteQuery: ReturnType<typeof useInfiniteConversationsQuery>
) {
  const conversations: Conversation[] =
    infiniteQuery.data?.pages.flatMap(page => page.results || []) || [];

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
 * Fetch and cache AI context state for a conversation.
 *
 * Fires on conversation open. Result feeds compact_summary / compact_to_message
 * into each Sara AI message payload.
 *
 * Future: when device-side SQLite is in place, this hook checks the local cache
 * first and only hits the network on a cache miss or explicit invalidation.
 */
export function useConversationContextQuery(convoId: string | null) {
  return useQuery<ConversationContext>({
    queryKey: ['conversationContext', convoId],
    queryFn: () => {
      if (!convoId) throw new Error('Conversation ID required');
      return fetchConversationContext(convoId);
    },
    enabled: !!convoId,
    staleTime: 5 * 60 * 1000, // 5 min — compaction is async, no need to refetch every message
    retry: 1,
  });
}
