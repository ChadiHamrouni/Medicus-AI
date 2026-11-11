import Message from '@/components/features/chat/Message';
import { useAuthContext } from '@/contexts/AuthContext';
import { IMessage } from '@/types';
import { UserRole } from '@/types/auth';
import React, { RefObject, useEffect, useRef } from 'react';
import { FlatList, View, Text, ActivityIndicator } from 'react-native';

interface ChatMessagesProps {
  messages: IMessage[];
  currentUser: string;
  otherParticipant: string;
  isOtherParticipantTyping: boolean;
  scrollViewRef: RefObject<any>;
  onRetryUpload?: (_messageId: string) => void;
  onDeleteAttachment?: (_messageId: string) => void;
  conversationId?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isSaraConversation?: boolean;
}

function ChatMessages({
  messages,
  currentUser: _currentUser,
  otherParticipant,
  isOtherParticipantTyping: _isOtherParticipantTyping,
  scrollViewRef,
  onRetryUpload,
  onDeleteAttachment: _onDeleteAttachment,
  conversationId,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isSaraConversation = false,
}: ChatMessagesProps) {
  const { authState } = useAuthContext();
  const isDoctor = authState.user?.role === UserRole.DOCTOR;
  const reversedMessages = [...messages].reverse();

  const newestMessageIdRef = useRef<string | number | null>(null);

  // Scroll to bottom only when the newest message changes (new message sent/received)
  useEffect(() => {
    if (messages.length === 0) return;

    // Assuming messages are sorted Oldest -> Newest
    const newestMessage = messages[messages.length - 1];
    const currentNewestId = newestMessage.id;
    const previousNewestId = newestMessageIdRef.current;

    // If the newest message is different from what we last saw, scroll to bottom
    if (currentNewestId !== previousNewestId) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
        }
      }, 100);

      // Update ref
      newestMessageIdRef.current = currentNewestId;
    }
  }, [messages, scrollViewRef]);

  const renderMessage = ({ item }: { item: IMessage }) => {
    // Determine sender name based on whether it's Sara direct or Sara on behalf of someone
    // In a doctor's copy of a patient thread Sara works for the doctor, not for the patient.
    const senderName =
      item.senderId === 'assistant'
        ? isSaraConversation
          ? 'Sara AI Assistant'
          : isDoctor
            ? 'Sara - your clinical assistant'
            : `Sara - on behalf of ${otherParticipant}`
        : 'Me';

    return (
      <Message
        messageId={item.id}
        sender={senderName}
        text={item.text}
        timestamp={item.timestamp}
        isCurrentUser={item.senderId !== 'assistant'}
        attachments={item.attachments}
        isUploading={item.isUploading}
        uploadStatus={item.uploadStatus}
        onRetry={onRetryUpload}
        conversationId={conversationId}
        isLoading={item.isLoading}
      />
    );
  };

  const renderHeader = () => {
    if (!hasMore && !isLoadingMore) return null;

    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        {isLoadingMore ? (
          <>
            <ActivityIndicator size="small" color="#F05C0C" />
            <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 14 }}>
              Loading older messages...
            </Text>
          </>
        ) : (
          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
            Scroll up to load older messages
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <FlatList
        ref={scrollViewRef}
        data={reversedMessages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id || `msg-${index}`}
        inverted
        scrollEventThrottle={16}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        onEndReached={() => {
          if (hasMore && !isLoadingMore && onLoadMore) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderHeader}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

export default ChatMessages;
