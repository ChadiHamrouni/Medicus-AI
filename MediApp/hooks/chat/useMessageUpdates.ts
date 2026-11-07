import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { IMessage } from '@/types';
import { logger } from '@/utils';
import { QUERY_KEYS } from '../shared/useQueryConfig';

interface UseMessageUpdatesOptions {
  convoId: string;
  pageSize: number;
}

interface UseMessageUpdatesReturn {
  addTemporaryMessage: (message: IMessage) => void;
  updateMessage: (messageId: string, updates: Partial<IMessage>) => void;
  removeMessage: (messageId: string) => void;
}

export function useMessageUpdates({
  convoId,
  pageSize,
}: UseMessageUpdatesOptions): UseMessageUpdatesReturn {
  const queryClient = useQueryClient();

  const addTemporaryMessage = useCallback(
    (message: IMessage) => {
      const queryKey = QUERY_KEYS.messages.infinite(convoId, pageSize);

      queryClient.setQueryData(queryKey, (oldData: any) => {
        logger.info('📊 UPDATING QUERY CACHE', {
          component: 'useMessageUpdates',
          hasOldData: !!oldData,
          pagesCount: oldData?.pages?.length || 0,
          firstPageResultsCount: oldData?.pages?.[0]?.results?.length || 0,
          convoId: convoId.substring(0, 8),
          messageBeingAdded: message.id,
        });
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          // If no data exists, create initial structure
          return {
            pages: [
              {
                results: [message],
                next: null,
                page: 1,
                timestamp: undefined,
              },
            ],
            pageParams: [{ page: 1, timestamp: undefined }],
          };
        }

        // ✅ DUPLICATE DETECTION: Check if message already exists in cache
        const messageExists = oldData.pages.some((page: any) =>
          page.results.some((msg: any) => msg.id === message.id)
        );

        if (messageExists) {
          return oldData; // Return unchanged data
        }

        // Add to the BEGINNING of the first page (most recent messages)
        const updatedFirstPage = {
          ...oldData.pages[0],
          results: [message, ...oldData.pages[0].results],
        };

        const updatedData = {
          ...oldData,
          pages: [updatedFirstPage, ...oldData.pages.slice(1)],
        };

        logger.info('✅ CACHE UPDATED WITH NEW MESSAGE', {
          component: 'useMessageUpdates',
          messageId: message.id,
          newFirstPageCount: updatedFirstPage.results.length,
          totalPages: updatedData.pages.length,
        });

        return updatedData;
      });

      // Trigger a notification to all subscribers to force re-render
      queryClient.invalidateQueries({
        queryKey: queryKey,
        exact: true,
        refetchType: 'none', // Don't refetch, just notify subscribers
      });
    },
    [queryClient, convoId, pageSize]
  );

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<IMessage>) => {
      const queryKey = QUERY_KEYS.messages.infinite(convoId, pageSize);

      logger.info('🔄 Attempting to update message', {
        component: 'useMessageUpdates',
        messageId,
        updates,
        convoId: convoId.substring(0, 8),
      });

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) {
          logger.warn('❌ No old data found for message update', {
            component: 'useMessageUpdates',
            messageId,
          });
          return oldData;
        }

        let messageFound = false;

        const updatedPages = oldData.pages.map((page: any) => ({
          ...page,
          results: page.results.map((msg: any) => {
            if (msg.id === messageId) {
              messageFound = true;
              const updatedMsg = { ...msg, ...updates };
              logger.info('✅ Message found and updated', {
                component: 'useMessageUpdates',
                messageId,
                oldDisplayTimestamp: msg.displayTimestamp,
                newDisplayTimestamp: updatedMsg.displayTimestamp,
                wasTemporary: msg.isTemporary,
                nowTemporary: updatedMsg.isTemporary,
              });
              return updatedMsg;
            }
            return msg;
          }),
        }));

        if (!messageFound) {
          logger.warn('❌ Message not found for update', {
            component: 'useMessageUpdates',
            messageId,
            totalMessages: oldData.pages.reduce(
              (acc: number, page: any) => acc + page.results.length,
              0
            ),
            availableIds: oldData.pages.flatMap((page: any) =>
              page.results.map((msg: any) => msg.id)
            ),
          });
        }

        return {
          ...oldData,
          pages: updatedPages,
        };
      });
    },
    [queryClient, convoId, pageSize]
  );

  const removeMessage = useCallback(
    (messageId: string) => {
      const queryKey = QUERY_KEYS.messages.infinite(convoId, pageSize);

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;

        const updatedPages = oldData.pages.map((page: any) => ({
          ...page,
          results: page.results.filter((msg: any) => msg.id !== messageId),
        }));

        return {
          ...oldData,
          pages: updatedPages,
        };
      });
    },
    [queryClient, convoId, pageSize]
  );

  return {
    addTemporaryMessage,
    updateMessage,
    removeMessage,
  };
}
