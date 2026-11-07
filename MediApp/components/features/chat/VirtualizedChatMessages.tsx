import { IMessage } from '@/types';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshControl, View } from 'react-native';
import {
  ListFooter,
  LoadMoreIndicator,
  TypingIndicator,
} from './ChatIndicators';
import { MessageItem } from './MessageItem';

interface VirtualizedChatMessagesProps {
  messages: IMessage[];
  currentUser: string;
  _otherParticipant: string;
  isOtherParticipantTyping: boolean;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  onRetryUpload?: (_messageId: string) => void;
  _onDeleteAttachment?: (_messageId: string) => void;
  conversationId?: string;
}

const getMessageItemType = (item: IMessage): string => {
  if (item.id === 'typing-indicator') return 'typing';

  const attachments = item.attachments;
  if (attachments && attachments.length > 0) {
    const firstAttachment = attachments[0];
    switch (firstAttachment.type) {
      case 'audio':
        return 'audio';
      case 'image':
        return 'image';
      case 'file':
        return 'file';
      default:
        return 'attachment';
    }
  }

  return 'text';
};

function VirtualizedChatMessages({
  messages,
  currentUser,
  _otherParticipant,
  isOtherParticipantTyping,
  loading,
  hasMore,
  onLoadMore,
  onRefresh,
  refreshing = false,
  onRetryUpload,
  _onDeleteAttachment,
  conversationId,
}: VirtualizedChatMessagesProps) {
  const flashListRef = useRef<any>(null);

  // Include typing indicator as last item if needed
  const listData = useMemo(() => {
    if (isOtherParticipantTyping) {
      return [
        ...messages,
        {
          id: 'typing-indicator',
          senderId: 'typing',
          text: '',
          timestamp: new Date().toISOString(),
        } as IMessage,
      ];
    }
    return messages;
  }, [messages, isOtherParticipantTyping]);

  // Scroll to bottom when messages are loaded initially or when new messages arrive
  useEffect(() => {
    if (listData.length > 0 && flashListRef.current) {
      // Use a small delay to ensure the list is rendered
      setTimeout(() => {
        try {
          // Try scrollToIndex first (more reliable than scrollToEnd for FlashList)
          const lastIndex = listData.length - 1;
          flashListRef.current?.scrollToIndex({
            index: lastIndex,
            animated: false,
            viewPosition: 1, // Scroll to bottom of the item
          });
        } catch {
          // Fallback to scrollToEnd if scrollToIndex fails
          flashListRef.current?.scrollToEnd({ animated: false });
        }
      }, 150);
    }
  }, [listData.length]);

  // Scroll to bottom when new messages arrive (not just when loading initially)
  useEffect(() => {
    if (messages.length > 0 && flashListRef.current && !loading) {
      // Only scroll if we're not loading more messages (to avoid interrupting scroll-to-load-more)
      setTimeout(() => {
        try {
          const lastIndex = listData.length - 1;
          flashListRef.current?.scrollToIndex({
            index: lastIndex,
            animated: true,
            viewPosition: 1,
          });
        } catch {
          flashListRef.current?.scrollToEnd({ animated: true });
        }
      }, 150);
    }
  }, [messages, loading, listData.length]);

  const renderMessage: ListRenderItem<IMessage> = useCallback(
    ({ item }: { item: IMessage }) => {
      if (item.id === 'typing-indicator') {
        return <TypingIndicator />;
      }

      return (
        <MessageItem
          message={item}
          currentUser={currentUser}
          onRetryUpload={onRetryUpload}
          conversationId={conversationId}
        />
      );
    },
    [currentUser, onRetryUpload, conversationId]
  );

  // Header component for load more functionality
  const ListHeaderComponent = useCallback(() => {
    if (!hasMore || loading) return null;
    return <LoadMoreIndicator />;
  }, [hasMore, loading]);

  // Handle end reached (load more older messages)
  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  const keyExtractor = useCallback((item: IMessage) => item.id, []);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="#F05C0C"
        title="Pull to refresh"
      />
    ),
    [refreshing, onRefresh]
  );

  // Handle layout - scroll to bottom after the list has been laid out
  const handleLayout = useCallback(() => {
    if (listData.length > 0 && flashListRef.current) {
      setTimeout(() => {
        try {
          const lastIndex = listData.length - 1;
          flashListRef.current?.scrollToIndex({
            index: lastIndex,
            animated: false,
            viewPosition: 1,
          });
        } catch {
          flashListRef.current?.scrollToEnd({ animated: false });
        }
      }, 50);
    }
  }, [listData.length]);

  return (
    <View className="flex-1">
      <FlashList
        ref={flashListRef}
        data={listData}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        getItemType={getMessageItemType}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooter}
        refreshControl={refreshControl}
        onLayout={handleLayout}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
      />
    </View>
  );
}

const VirtualizedChatMessagesMemo = React.memo(
  VirtualizedChatMessages,
  (prevProps, nextProps) => {
    if (prevProps === nextProps) return true;

    if (
      prevProps.messages.length !== nextProps.messages.length ||
      prevProps.isOtherParticipantTyping !==
        nextProps.isOtherParticipantTyping ||
      prevProps.loading !== nextProps.loading ||
      prevProps.hasMore !== nextProps.hasMore ||
      prevProps.refreshing !== nextProps.refreshing ||
      prevProps.currentUser !== nextProps.currentUser ||
      prevProps.conversationId !== nextProps.conversationId
    ) {
      return false;
    }

    // If we have messages, check if the most recent ones changed
    if (prevProps.messages.length > 0 && nextProps.messages.length > 0) {
      const checkCount = Math.min(3, prevProps.messages.length); // Check last 3 messages

      for (let i = 0; i < checkCount; i++) {
        const prevMsg = prevProps.messages[prevProps.messages.length - 1 - i];
        const nextMsg = nextProps.messages[nextProps.messages.length - 1 - i];

        if (
          prevMsg.id !== nextMsg.id ||
          prevMsg.text !== nextMsg.text ||
          prevMsg.timestamp !== nextMsg.timestamp ||
          prevMsg.isUploading !== nextMsg.isUploading ||
          prevMsg.uploadStatus !== nextMsg.uploadStatus
        ) {
          return false;
        }
      }
    }

    return true;
  }
);

VirtualizedChatMessagesMemo.displayName = 'VirtualizedChatMessages';

export default VirtualizedChatMessagesMemo;
