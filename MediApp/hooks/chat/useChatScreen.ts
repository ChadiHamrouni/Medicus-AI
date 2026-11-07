/**
 * Chat screen hook - consolidates multiple hooks into a single interface
 */

import { useAuth } from '../auth/useAuth';
import { fetchConversationSummary, fetchConversationById } from '@/services';
import { socketIOService } from '@/services/realtime/socketio';
import { Attachment, Conversation, ConversationSummary } from '@/types';
import {
  env,
  registerErrorModalCallback,
  unregisterErrorModalCallback,
  logger,
} from '@/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QUERY_KEYS } from '../shared/useQueryConfig';
import { useMessages } from './useMessages';
import { useSendMessage } from './useSendMessage';

interface UseChatScreenReturn {
  // Chat data
  messages: any[];
  otherParticipantName: string;
  conversationId: string;

  // Loading states
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  isInitialLoading: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  isSendingMessage: boolean;

  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  handleSendText: (_text: string, _attachments?: Attachment[]) => Promise<void>;
  handleSendLocation: (_location: {
    latitude: number;
    longitude: number;
  }) => Promise<void>;
  loadSummary: () => Promise<void>;

  // Message management
  addTemporaryMessage: (_message: any) => void;
  updateMessage: (_messageId: string, _updates: any) => void;

  // Error handling
  errorModalVisible: boolean;
  errorTitle: string;
  errorMessage: string;
  hideErrorModal: () => void;

  // Summary
  summary: ConversationSummary | null;
  summaryLoading: boolean;

  // Other
  currentUserId: string;
  receiverId: number;
  isSaraConversation: boolean;

  // Message status helpers
  getMessageStatus: (_message: any) => 'sent' | 'sending' | 'failed';
  isMessageSending: (_message: any) => boolean;
  isMessageFailed: (_message: any) => boolean;
  getMessageDisplayText: (_message: any) => string | undefined;
  debugMessage: (_message: any) => void; // New debug helper
  conversation: Conversation | null;
}

export const useChatScreen = (): UseChatScreenReturn => {
  const { id, chatId, displayName, isSara } = useLocalSearchParams();
  const { authState } = useAuth();
  const queryClient = useQueryClient();

  // Use id parameter from route (from [id].tsx) if chatId is not available
  const actualChatId = chatId || id;

  // State
  const [otherParticipantName, setOtherParticipantName] = useState<string>(
    displayName ? (displayName as string) : 'Chat Participant'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Derived values
  const chatIdString = Array.isArray(actualChatId)
    ? actualChatId[0]
    : actualChatId || '';

  // Get isSara from URL params (passed as string "true" or "false")
  const isSaraConversation = isSara === 'true';

  // Get conversation from React Query cache
  const cachedConversation = useMemo<Conversation | null>(() => {
    if (!chatIdString) return null;

    const conversationMap = new Map<string, Conversation>();

    // Try to get from infinite query cache (primary source)
    const infiniteData = queryClient.getQueryData<any>(
      QUERY_KEYS.conversations.infinite(20)
    );

    if (infiniteData?.pages) {
      for (const page of infiniteData.pages) {
        page.results?.forEach((c: Conversation) => {
          conversationMap.set(c.id, c);
        });
      }
    }

    // Fallback: try list query cache
    if (conversationMap.size === 0) {
      const listData = queryClient.getQueryData<any>(
        QUERY_KEYS.conversations.list(20)
      );

      if (listData?.results) {
        listData.results.forEach((c: Conversation) => {
          conversationMap.set(c.id, c);
        });
      }
    }

    const found = conversationMap.get(chatIdString);
    return found || null;
  }, [chatIdString, queryClient]);

  const [fetchedConversation, setFetchedConversation] =
    useState<Conversation | null>(null);
  const conversation = cachedConversation || fetchedConversation;

  // Calculate currentUserId for deduplication (matches sender_id in messages)
  // For patients: Use conversation's patient_id (handles dependents correctly)
  // For doctors: Use doctor profile ID
  const currentUserId = useMemo(() => {
    if (authState.user?.role === 'patient') {
      // Use conversation's patient_id if available (for dependents)
      // Otherwise fallback to auth state patient profile ID
      return (
        conversation?.patient_id?.toString() ||
        authState.patientProfile?.id?.toString() ||
        authState.user?.id?.toString() ||
        ''
      );
    } else {
      // For doctors: use doctor profile ID
      return (
        authState.doctorProfile?.id?.toString() ||
        authState.user?.id?.toString() ||
        ''
      );
    }
  }, [
    authState.user?.role,
    authState.user?.id,
    authState.patientProfile?.id,
    authState.doctorProfile?.id,
    conversation?.patient_id,
  ]);

  // Fetch conversation details if not in cache
  useEffect(() => {
    if (!chatIdString || cachedConversation) return;

    // Only fetch if we haven't already and we don't have it in cache
    let isMounted = true;

    const loadConversation = async () => {
      try {
        logger.info('Fetching missing conversation details', {
          component: 'useChatScreen',
          chatId: chatIdString,
        });
        const details = await fetchConversationById(chatIdString);
        if (isMounted) {
          setFetchedConversation(details);
        }
      } catch (err) {
        logger.error('Failed to fetch conversation details', err as Error, {
          component: 'useChatScreen',
          chatId: chatIdString,
        });
        setErrorTitle('Error Loading Chat');
        setErrorMessage(
          'Could not load conversation details. Some features might be unavailable.'
        );
        setErrorModalVisible(true);
      }
    };

    loadConversation();

    return () => {
      isMounted = false;
    };
  }, [chatIdString, cachedConversation]);

  // Effect to update participant name if missing (works for both cached and fetched conversations)
  useEffect(() => {
    if (!conversation) return;

    if (displayName && displayName !== 'Chat Participant') return;

    if (otherParticipantName !== 'Chat Participant') return;

    let resolvedName = 'Chat Participant';

    const isSara =
      (conversation.assistant === 'medidoc' ||
        conversation.assistant === 'mediaid') &&
      ((conversation.doctor_id && !conversation.patient_id) ||
        (conversation.patient_id && !conversation.doctor_id));

    if (isSara) {
      resolvedName = 'Sara - your Health Assistant';
    } else {
      const userRole = authState.user?.role;
      if (userRole === 'patient' && conversation.doctor) {
        resolvedName = `Dr. ${conversation.doctor.name}`;
      } else if (userRole === 'doctor' && conversation.patient) {
        resolvedName = conversation.patient.name;
      } else if (conversation.patient && conversation.patient.name) {
        resolvedName = conversation.patient.name;
      }
    }

    if (resolvedName !== 'Chat Participant') {
      setOtherParticipantName(resolvedName);
    }
  }, [conversation, displayName, otherParticipantName, authState.user?.role]);

  // Get access token directly from authState (already available!)
  const accessToken = authState.token || undefined;

  // Messages hook
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    refresh,
    addTemporaryMessage,
    updateMessage,
    isInitialLoading,
    isFetchingNextPage,
    isRefetching,
  } = useMessages({
    convoId: chatIdString,
    currentUserId: currentUserId,
    pageSize: 10,
    // In dev, allow messages to load with mock data even without auth
    enabled: env.isDevelopmentMode()
      ? Boolean(chatIdString)
      : Boolean(chatIdString && authState.user),
    authToken: accessToken,
  });

  // Debug: Log useMessages parameters
  logger.info('useChatScreen calling useMessages with params', {
    component: 'useChatScreen',
    chatIdString,
    currentUserId,
    hasAuthUser: !!authState.user,
    hasAuthToken: !!accessToken,
    authTokenLength: accessToken?.length || 0,
    authTokenType: typeof accessToken,
    enabled: env.isDevelopmentMode()
      ? Boolean(chatIdString)
      : Boolean(chatIdString && authState.user),
    isDevelopmentMode: env.isDevelopmentMode(),
  });

  // Send message hook - handles null conversation gracefully
  const {
    sendTextMessage,
    receiverId,
    isLoading: isSendingMessage,
  } = useSendMessage({
    conversation: conversation,
    currentUserId: currentUserId,
    addTemporaryMessage,
    updateMessage,
    onError: (title: string, message: string) => {
      setErrorModalVisible(true);
      setErrorTitle(title);
      setErrorMessage(message);
    },
    isSaraConversation,
  });

  // Effects
  useEffect(() => {
    // Register error modal callback
    registerErrorModalCallback((visible, title, message) => {
      setErrorModalVisible(visible);
      setErrorTitle(title);
      setErrorMessage(message);
    });

    return () => {
      unregisterErrorModalCallback();
      // Disconnect Socket.IO when leaving chat screen
      socketIOService.disconnect();
      logger.info('Socket.IO disconnected - leaving chat screen', {
        component: 'useChatScreen',
        chatId: chatIdString.substring(0, 8),
      });
    };
  }, [chatIdString]);

  useEffect(() => {
    if (displayName && displayName !== otherParticipantName) {
      setOtherParticipantName(displayName as string);
    }
  }, [displayName, otherParticipantName]);

  // Actions
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const hideErrorModal = useCallback(() => {
    setErrorModalVisible(false);
    setErrorTitle('');
    setErrorMessage('');
  }, []);

  const handleSendText = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      await sendTextMessage(text, attachments);
    },
    [sendTextMessage]
  );

  const handleSendLocation = useCallback(
    async (location: { latitude: number; longitude: number }) => {
      // Location sharing is disabled
      logger.warn('Location sharing attempted but is disabled', {
        component: 'useChatScreen',
        location,
      });
    },
    []
  );

  // Load conversation summary
  const loadSummary = useCallback(async () => {
    if (!chatIdString) return;

    setSummaryLoading(true);
    try {
      const summaryData = await fetchConversationSummary(chatIdString);
      setSummary(summaryData);

      // Invalidate conversations cache to update unsummarized badge
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
    } catch (error) {
      logger.error('Failed to load conversation summary', error as Error, {
        component: 'useChatScreen',
        chatId: chatIdString,
      });
    } finally {
      setSummaryLoading(false);
    }
  }, [chatIdString, queryClient]);

  // Message status helpers
  const getMessageStatus = useCallback(
    (message: any): 'sent' | 'sending' | 'failed' => {
      // Check explicit status first
      if (message.uploadStatus === 'sending' || message.isUploading === true) {
        return 'sending';
      }
      if (message.uploadStatus === 'failed' || message.isFailed === true) {
        return 'failed';
      }
      if (
        message.uploadStatus === 'sent' ||
        (!message.isTemporary && !message.isUploading)
      ) {
        return 'sent';
      }

      // Fallback based on temporary status
      if (message.isTemporary) {
        return 'sending';
      }

      return 'sent';
    },
    []
  );

  const isMessageSending = useCallback((message: any): boolean => {
    return (
      message.uploadStatus === 'sending' ||
      message.isUploading === true ||
      (message.isTemporary && !message.isFailed)
    );
  }, []);

  const isMessageFailed = useCallback((message: any): boolean => {
    return message.uploadStatus === 'failed' || message.isFailed === true;
  }, []);

  const getMessageDisplayText = useCallback(
    (message: any): string | undefined => {
      if (message.displayTimestamp) {
        return message.displayTimestamp;
      }

      const status = getMessageStatus(message);
      switch (status) {
        case 'sending':
          // return "Sending..."; // Temporarily commented out
          return undefined;
        case 'failed':
          return 'Failed to send';
        default:
          return undefined;
      }
    },
    [getMessageStatus]
  );

  return {
    // Chat data
    messages,
    otherParticipantName,
    conversationId: actualChatId as string,

    // Loading states
    loading,
    refreshing,
    hasMore,
    isInitialLoading,
    isFetchingNextPage,
    isRefetching,
    isSendingMessage,

    // Actions
    loadMore,
    refresh,
    handleRefresh,
    handleSendText,
    handleSendLocation,
    loadSummary,

    // Message management
    addTemporaryMessage,
    updateMessage,

    // Error handling
    errorModalVisible,
    errorTitle,
    errorMessage,
    hideErrorModal,

    // Summary
    summary,
    summaryLoading,

    // Other
    currentUserId,
    receiverId,
    isSaraConversation,

    // Message status helpers
    getMessageStatus,
    isMessageSending,
    isMessageFailed,
    getMessageDisplayText, // New helper

    // Add debug helper
    debugMessage: useCallback(
      (message: any) => {
        logger.debug('Message debug', {
          component: 'useChatScreen',
          messageId: message.id,
          uploadStatus: message.uploadStatus,
          isUploading: message.isUploading,
          isFailed: message.isFailed,
          isTemporary: message.isTemporary,
          displayTimestamp: message.displayTimestamp,
          status: getMessageStatus(message),
        });
      },
      [getMessageStatus]
    ),
    conversation,
  };
};
