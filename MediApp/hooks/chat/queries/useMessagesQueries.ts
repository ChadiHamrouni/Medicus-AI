/**
 * TanStack Query hooks for conversation messages data fetching
 */

import { fetchConversationMessages } from '@/services';
import type { IMessage } from '@/types';
import { logger } from '@/utils';
import {
  sortMessagesByTimestamp,
  transformApiMessagesToIMessages,
} from '@/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../../shared/useQueryConfig';

export const MESSAGE_QUERY_KEYS = QUERY_KEYS.messages;

interface PageParam {
  page: number;
  timestamp?: string;
}

/**
 * Hook to get conversation messages with infinite scrolling (reverse chronological)
 */
export function useInfiniteMessagesQuery(
  convoId: string,
  currentUserId: string,
  pageSize: number = 50,
  enabled: boolean = true
) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.messages.infinite(convoId, pageSize),
    queryFn: async ({ pageParam }: { pageParam: PageParam }) => {
      const { page, timestamp } = pageParam;

      logger.debug('Fetching messages page', {
        component: 'useInfiniteMessages',
        convoId: convoId.substring(0, 8),
        page,
        timestamp,
        pageSize,
      });

      const response = await fetchConversationMessages(
        convoId,
        timestamp,
        page,
        pageSize
      );

      logger.info('Messages page fetched successfully', {
        component: 'useInfiniteMessages',
        convoId: convoId.substring(0, 8),
        page,
        resultCount: response.results?.length || 0,
      });

      return {
        ...response,
        page,
        timestamp,
      };
    },
    initialPageParam: {
      page: 1,
      // Don't use timestamp for first page - let API return most recent messages
      // API uses ORDER BY created_at DESC, so no 'since' filter gives newest messages
      timestamp: undefined,
    } as PageParam,
    getNextPageParam: (lastPage, allPages) => {
      // If there's no next page, return undefined
      if (!lastPage.next) return undefined;

      // Based on API analysis: since parameter gets messages NEWER than timestamp
      // For pagination, we don't use timestamp - just rely on page numbers
      // API uses ORDER BY created_at DESC with OFFSET/LIMIT for pagination

      return {
        page: allPages.length + 1,
        timestamp: undefined, // Don't use timestamp for pagination, rely on page/offset
      } as PageParam;
    },
    enabled: enabled && !!convoId,
    ...SHARED_QUERY_CONFIG.MESSAGES,
  });
}

/**
 * Transform infinite query data to flat messages array with proper sorting
 */
export function useMessagesData(
  infiniteQuery: ReturnType<typeof useInfiniteMessagesQuery>,
  currentUserId: string
) {
  // Transform and combine all pages
  const allMessages: IMessage[] =
    infiniteQuery.data?.pages.flatMap(page => {
      return transformApiMessagesToIMessages(page.results, currentUserId);
    }) || [];

  // Sort messages chronologically (oldest first, newest at bottom)
  const sortedMessages = sortMessagesByTimestamp(allMessages);

  return {
    messages: sortedMessages,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    fetchNextPage: infiniteQuery.fetchNextPage,
    refetch: infiniteQuery.refetch,
  };
}

/**
 * Hook for managing message state with optimistic updates
 */
export function useMessagesWithMutations(
  convoId: string,
  currentUserId: string,
  pageSize: number = 50,
  enabled: boolean = true
) {
  const infiniteQuery = useInfiniteMessagesQuery(
    convoId,
    currentUserId,
    pageSize,
    enabled
  );
  const messagesData = useMessagesData(infiniteQuery, currentUserId);

  // TODO: Add optimistic update functions here
  const addTemporaryMessage = (_message: IMessage) => {
    // This would use queryClient.setQueryData to optimistically add a message
    // Implementation would depend on your specific needs
  };

  const updateMessage = (_messageId: string, _updates: Partial<IMessage>) => {
    // This would use queryClient.setQueryData to optimistically update a message
    // Implementation would depend on your specific needs
  };

  const removeMessage = (_messageId: string) => {
    // This would use queryClient.setQueryData to optimistically remove a message
    // Implementation would depend on your specific needs
  };

  return {
    ...messagesData,
    addTemporaryMessage,
    updateMessage,
    removeMessage,
    // Alias for compatibility with existing code
    loadMore: messagesData.fetchNextPage,
    loading: messagesData.isLoading || messagesData.isFetchingNextPage,
    hasMore: messagesData.hasNextPage,
    refresh: messagesData.refetch,
  };
}
