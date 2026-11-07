/**
 * Message hook - combines query, transformation, and optimistic updates
 */

import { fetchConversationMessages } from '@/services';
import type { IMessage } from '@/types';
import {
  sortMessagesByTimestamp,
  transformApiMessageToIMessage,
  transformApiMessagesToIMessages,
  logger,
} from '@/utils';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useErrorHandler } from '../shared/useErrorHandling';
import { QUERY_KEYS, SHARED_QUERY_CONFIG } from '../shared/useQueryConfig';
import { useMessageUpdates } from './useMessageUpdates';
import { useSocketIOMessages } from './useSocketIOMessages';

interface PageParam {
  page: number;
  timestamp?: string;
}

interface UseMessagesOptions {
  convoId: string;
  currentUserId: string;
  pageSize?: number;
  enabled?: boolean;
  authToken?: string;
}

interface UseMessagesReturn {
  messages: IMessage[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Optimistic update functions
  addTemporaryMessage: (_message: IMessage) => void;
  updateMessage: (_messageId: string, _updates: Partial<IMessage>) => void;
  removeMessage: (_messageId: string) => void;

  // Advanced state
  isInitialLoading: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
}

export function useMessages({
  convoId,
  currentUserId,
  pageSize = 10,
  enabled = true,
  authToken,
}: UseMessagesOptions): UseMessagesReturn {
  const queryClient = useQueryClient();
  const { logError, getDisplayError } = useErrorHandler({
    component: 'useMessages',
    context: { convoId: convoId.substring(0, 8) },
    showUserFriendlyMessage: true,
  });

  const infiniteQuery = useInfiniteQuery({
    queryKey: QUERY_KEYS.messages.infinite(convoId, pageSize),
    queryFn: async ({ pageParam }: { pageParam: PageParam }) => {
      const { page, timestamp } = pageParam;

      try {
        const response = await fetchConversationMessages(
          convoId,
          timestamp,
          page,
          pageSize
        );

        logger.info('Messages page fetched successfully', {
          component: 'useMessages',
          convoId: convoId.substring(0, 8),
          page,
          resultCount: response.results?.length || 0,
          hasNewMessages:
            response.results?.some((msg: any) => msg.id >= 5009) || false,
          latestMessageId: response.results?.[0]?.id || null,
        });

        return {
          ...response,
          page,
          timestamp,
        };
      } catch (error) {
        logger.error('Failed to fetch messages page', error as Error, {
          component: 'useMessages',
          convoId: convoId.substring(0, 8),
          page,
          timestamp,
          pageSize,
        });
        throw error;
      }
    },
    initialPageParam: {
      page: 1,
      timestamp: undefined,
    } as PageParam,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined;

      const transformedMessages = transformApiMessagesToIMessages(
        lastPage.results,
        currentUserId
      );

      if (transformedMessages.length === 0) return undefined;

      return {
        page: allPages.length + 1,
        timestamp: undefined,
      } as PageParam;
    },
    enabled: enabled && !!convoId,
    ...SHARED_QUERY_CONFIG.MESSAGES,
  });

  // Transform and combine all pages
  const allMessages: IMessage[] =
    infiniteQuery.data?.pages.flatMap(page => {
      return page.results
        .map((item: any) => {
          // Check if this is already an IMessage (temporary message)
          if (
            item.isTemporary ||
            item.uploadStatus ||
            typeof item.senderId === 'string'
          ) {
            return item as IMessage;
          }
          // Otherwise, transform API message to IMessage
          const transformed = transformApiMessageToIMessage(
            item,
            currentUserId
          );
          return transformed;
        })
        .filter(Boolean);
    }) || [];

  // Sort messages chronologically
  const sortedMessages = sortMessagesByTimestamp(allMessages);

  // Debug: Log message order to understand what we're getting
  if (sortedMessages.length > 0 && __DEV__) {
    const firstMsg = sortedMessages[0];
    const lastMsg = sortedMessages[sortedMessages.length - 1];
    logger.info('Message order check', {
      component: 'useMessages',
      convoId: convoId.substring(0, 8),
      totalMessages: sortedMessages.length,
      firstMessage: {
        timestamp: firstMsg.timestamp,
        text: firstMsg.text?.substring(0, 30) + '...',
        isNewest: false, // should be oldest after sorting
      },
      lastMessage: {
        timestamp: lastMsg.timestamp,
        text: lastMsg.text?.substring(0, 30) + '...',
        isNewest: true, // should be newest after sorting
      },
    });
  }

  const errorMessage = infiniteQuery.error
    ? getDisplayError(infiniteQuery.error as Error)
    : null;

  // Actions
  const loadMore = useCallback(async () => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      try {
        await infiniteQuery.fetchNextPage();
      } catch (error) {
        logError(error as Error, { action: 'loadMore' });
      }
    }
  }, [infiniteQuery, logError]);

  const refresh = useCallback(async () => {
    try {
      // Reset the infinite query to start fresh from page 1 without timestamp filtering
      // This ensures we get the latest messages including any just sent
      await queryClient.resetQueries({
        queryKey: QUERY_KEYS.messages.infinite(convoId, pageSize),
        exact: true,
      });

      // Also invalidate to trigger a fresh fetch
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.infinite(convoId, pageSize),
        exact: true,
        refetchType: 'active',
      });
    } catch (error) {
      logError(error as Error, { action: 'refresh' });
    }
  }, [queryClient, convoId, pageSize, logError]);

  // Use the new hooks
  const { addTemporaryMessage, updateMessage, removeMessage } =
    useMessageUpdates({
      convoId,
      pageSize,
    });

  useSocketIOMessages({
    convoId,
    currentUserId,
    enabled,
    authToken,
    pageSize,
    addTemporaryMessage,
    updateMessage,
    removeMessage,
  });

  return {
    messages: sortedMessages,
    loading: infiniteQuery.isLoading || infiniteQuery.isFetchingNextPage,
    error: errorMessage,
    hasMore: infiniteQuery.hasNextPage || false,
    loadMore,
    refresh,
    addTemporaryMessage,
    updateMessage,
    removeMessage,
    // Advanced state
    isInitialLoading:
      infiniteQuery.isLoading && !infiniteQuery.isFetchingNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isRefetching: infiniteQuery.isRefetching,
  };
}
