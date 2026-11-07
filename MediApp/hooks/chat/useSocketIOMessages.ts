import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketIOService } from '@/services/realtime/socketio';
import { logger, transformApiMessageToIMessage } from '@/utils';
import { QUERY_KEYS } from '../shared/useQueryConfig';
import { IMessage } from '@/types';

interface UseSocketIOMessagesOptions {
  convoId: string;
  currentUserId: string;
  enabled: boolean;
  authToken?: string;
  pageSize: number;
  addTemporaryMessage: (message: IMessage) => void;
  updateMessage: (messageId: string, updates: Partial<IMessage>) => void;
  removeMessage: (messageId: string) => void;
}

export function useSocketIOMessages({
  convoId,
  currentUserId,
  enabled,
  authToken,
  pageSize,
  addTemporaryMessage,
  updateMessage,
  removeMessage,
}: UseSocketIOMessagesOptions) {
  const queryClient = useQueryClient();
  const wsListenerIdRef = useRef(`messages_${convoId}_${Date.now()}`);

  // WebSocket integration for real-time message updates
  useEffect(() => {
    logger.debug('useSocketIOMessages effect', {
      component: 'useSocketIOMessages',
      convoId: convoId?.substring(0, 8),
      enabled,
    });

    if (!convoId || !enabled) {
      return;
    }

    // Don't attempt WebSocket connection without auth token
    if (!authToken) {
      return;
    }

    const listenerId = wsListenerIdRef.current;

    // Connect to Socket.IO
    const connectSocketIO = async () => {
      try {
        await socketIOService.connect(currentUserId, authToken, convoId);
        logger.info('Socket.IO connected', {
          component: 'useSocketIOMessages',
          convoId: convoId.substring(0, 8),
        });
      } catch (error) {
        logger.error('Socket.IO connection failed', error as Error, {
          component: 'useSocketIOMessages',
          convoId: convoId.substring(0, 8),
        });
      }
    };

    connectSocketIO();

    // Listen for new messages via Socket.IO
    const handleSocketIOMessage = (messageData: any) => {
      console.log('Socket.IO message received', {
        component: 'useSocketIOMessages',
        convoId: convoId.substring(0, 8),
        messageType: messageData?.type,
        messageData,
      });

      // Handle various message types for compatibility
      const isMessageEvent =
        messageData?.type === 'message' ||
        messageData?.type === 'new_message' ||
        messageData?.type === 'chat_message' ||
        messageData?.type === 'ai_response' ||
        messageData?.message ||
        messageData?.content;

      if (isMessageEvent) {
        // Check if the message is for this conversation
        const messageConvoId =
          messageData?.conversationId || messageData?.conversation_id;
        if (messageConvoId === convoId) {
          // Try to add the message immediately for instant display
          if (messageData.message || messageData.content || messageData.text) {
            logger.debug('Processing optimistic message', {
              component: 'useSocketIOMessages',
              messageContent:
                messageData.message || messageData.content || messageData.text,
            });

            try {
              const newMessage = transformApiMessageToIMessage(
                messageData,
                currentUserId
              );
              if (newMessage) {
                // Optimistic duplication prevention
                // We SKIP if:
                // 1. It's from the current user
                // 2. AND it's NOT an "ai_response" type (which would be a transcription/update)
                const isFromUser = newMessage.senderId === currentUserId;
                const isAiResponse = messageData.type === 'ai_response';

                if (isFromUser && !isAiResponse) {
                  logger.info(
                    '⏭️ Skipping Socket.IO message from current user (already optimistically added)',
                    {
                      component: 'useSocketIOMessages',
                      messageId: newMessage.id,
                      senderId: newMessage.senderId,
                    }
                  );
                  return;
                }

                const queryKey = QUERY_KEYS.messages.infinite(
                  convoId,
                  pageSize
                );

                // Check if this message has both audio_io and text_io (transcription completed)
                const messageContent = messageData.content;
                if (messageContent?.audio_io && messageContent?.text_io) {
                }

                // If this is a message from Sara (assistant), remove any loading messages
                if (newMessage.senderId === 'assistant') {
                  // Remove all Sara loading messages
                  queryClient.setQueryData(queryKey, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;

                    const updatedPages = oldData.pages.map((page: any) => ({
                      ...page,
                      results: page.results.filter(
                        (msg: any) =>
                          !(
                            msg.isLoading === true &&
                            msg.senderId === 'assistant'
                          )
                      ),
                    }));

                    return {
                      ...oldData,
                      pages: updatedPages,
                    };
                  });

                  logger.info('✅ Removed Sara loading messages', {
                    component: 'useSocketIOMessages',
                    convoId: convoId.substring(0, 8),
                  });
                }

                // If it's a user transcription (AI response), we want to update any existing matching message
                if (isFromUser && isAiResponse) {
                  logger.info('🎤 Processing user transcription/update', {
                    component: 'useSocketIOMessages',
                    messageId: newMessage.id,
                    text: newMessage.text,
                  });

                  // STRATEGY: Find any temporary audio message from this user and UPDATE it
                  // This handles the case where timestamps or IDs don't perfectly match
                  const queryKey = QUERY_KEYS.messages.infinite(
                    convoId,
                    pageSize
                  );

                  // We need to inspect the cache to find the temp message ID
                  const cacheData = queryClient.getQueryData(queryKey) as any;
                  let tempMessageIdToUpdate: string | undefined;

                  if (cacheData?.pages) {
                    for (const page of cacheData.pages) {
                      // Look for the most recent temporary audio message from this user
                      const tempAudioMsg = page.results?.find((msg: any) => {
                        const msgId = msg.id.toString();
                        // Match both "temp-" and "temp_" prefixes just in case
                        const isTempId =
                          msgId.startsWith('temp-') ||
                          msgId.startsWith('temp_');
                        const isTemp = msg.isTemporary || isTempId;

                        // Check for audio attachment OR just being a temp message from user if we assume serial processing
                        const hasAudio = msg.attachments?.some(
                          (att: any) => att.type === 'audio'
                        );
                        return (
                          isTemp && hasAudio && msg.senderId === currentUserId
                        );
                      });

                      if (tempAudioMsg) {
                        tempMessageIdToUpdate = tempAudioMsg.id;
                        logger.info(
                          '🎤 Found temporary audio message to update',
                          {
                            component: 'useSocketIOMessages',
                            tempId: tempMessageIdToUpdate,
                            realId: newMessage.id,
                          }
                        );
                        break; // Found it
                      }
                    }
                  }

                  if (tempMessageIdToUpdate) {
                    // Update the existing temporary message with the new real message data
                    updateMessage(tempMessageIdToUpdate, {
                      ...newMessage,
                      isTemporary: false,
                      isUploading: false,
                      uploadStatus: 'sent',
                    });
                  } else {
                    // Fallback: If no temp message found, just add the new one
                    addTemporaryMessage(newMessage);
                  }
                } else {
                  // Standard path for other messages
                  // Add the message optimistically
                  addTemporaryMessage(newMessage);
                }
              } else {
                logger.warn('⚠️ transformApiMessageToIMessage returned null', {
                  component: 'useSocketIOMessages',
                  messageData,
                });
              }
            } catch (error) {
              logger.error(
                '❌ Failed to transform Socket.IO message',
                error as Error,
                {
                  component: 'useSocketIOMessages',
                  convoId: convoId.substring(0, 8),
                  messageData,
                  errorMessage:
                    error instanceof Error ? error.message : String(error),
                }
              );
            }
          } else {
            logger.warn('⚠️ Socket.IO message has no content to display', {
              component: 'useSocketIOMessages',
              messageData,
            });
          }

          // Don't invalidate cache for WebSocket messages - they are the source of truth
          // Only invalidate on user-initiated refreshes or navigation
          logger.info(
            '📡 WebSocket message processed - skipping cache invalidation',
            {
              component: 'useSocketIOMessages',
              convoId: convoId.substring(0, 8),
              note: 'WebSocket is authoritative for real-time messages',
            }
          );
        } else {
          logger.info('🚫 Message is for different conversation, ignoring', {
            component: 'useSocketIOMessages',
            currentConvoId: convoId.substring(0, 8),
            messageConvoId: messageConvoId
              ? messageConvoId.substring(0, 8)
              : 'undefined',
          });
        }
      }
    };

    // Listen for conversation updates (which might include new messages)
    const handleConversationUpdate = (updateData: any) => {
      logger.info('Socket.IO conversation update received', {
        component: 'useSocketIOMessages',
        convoId: convoId.substring(0, 8),
        updateData: updateData,
      });

      const updateConvoId =
        updateData?.conversationId || updateData?.conversation_id;
      if (updateConvoId === convoId) {
        // Immediately refresh messages when conversation is updated
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.messages.infinite(convoId, pageSize),
          exact: true,
          refetchType: 'active',
        });
      }
    };

    // Handle compaction feedback — invalidate conversation context so
    // useSendMessage picks up the new compact_summary and resets its rolling window.
    const handleCompactionComplete = (data: any) => {
      const compactionConvoId = data?.conversation_id || data?.conversationId;
      if (compactionConvoId === convoId) {
        logger.info('Compaction complete, invalidating conversation context', {
          component: 'useSocketIOMessages',
          convoId: convoId.substring(0, 8),
        });
        queryClient.invalidateQueries({
          queryKey: ['conversationContext', convoId],
        });
      }
    };

    // Register Socket.IO listeners
    socketIOService.onMessage(listenerId, handleSocketIOMessage);
    socketIOService.onConversationUpdate(
      `${listenerId}_update`,
      handleConversationUpdate
    );
    socketIOService.onCompaction(
      `${listenerId}_compaction`,
      handleCompactionComplete
    );

    logger.info('🎧 Socket.IO listeners registered for messages', {
      component: 'useSocketIOMessages',
      convoId: convoId.substring(0, 8),
      listenerId,
      isSocketIOConnected: socketIOService.isConnected(),
      socketIOStats: socketIOService.getConnectionStats(),
    });

    // Cleanup listeners on unmount or dependency change
    return () => {
      // Clean up Socket.IO listeners
      socketIOService.removeListener(listenerId);
      socketIOService.removeListener(`${listenerId}_update`);
      socketIOService.removeListener(`${listenerId}_compaction`);

      // Don't disconnect connections here - they should persist across re-renders
      // Only disconnect when the conversation actually changes or app unmounts
      logger.info('Socket.IO listeners cleaned up (connection kept alive)', {
        component: 'useSocketIOMessages',
        convoId: convoId.substring(0, 8),
        listenerId,
        note: 'Socket.IO connection maintained for persistence',
      });
    };
  }, [
    convoId,
    enabled,
    queryClient,
    pageSize,
    currentUserId,
    authToken,
    addTemporaryMessage,
    updateMessage,
    removeMessage,
  ]);
}
