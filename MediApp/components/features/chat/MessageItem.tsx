import Message from '@/components/features/chat/Message';
import { IMessage } from '@/types';
import React from 'react';

interface MessageItemProps {
  message: IMessage;
  currentUser: string;
  onRetryUpload?: (_messageId: string) => void;
  conversationId?: string;
}

const messagePropsAreEqual = (
  prevProps: MessageItemProps,
  nextProps: MessageItemProps
) => {
  const {
    message: prevMessage,
    currentUser: prevCurrentUser,
    conversationId: prevConversationId,
  } = prevProps;
  const {
    message: nextMessage,
    currentUser: nextCurrentUser,
    conversationId: nextConversationId,
  } = nextProps;

  if (prevMessage === nextMessage && prevCurrentUser === nextCurrentUser) {
    return true;
  }

  if (
    prevMessage.id !== nextMessage.id ||
    prevMessage.text !== nextMessage.text ||
    prevMessage.timestamp !== nextMessage.timestamp ||
    prevMessage.isUploading !== nextMessage.isUploading ||
    prevMessage.uploadStatus !== nextMessage.uploadStatus ||
    prevMessage.senderId !== nextMessage.senderId ||
    prevCurrentUser !== nextCurrentUser
  ) {
    return false;
  }

  // Deep comparison for arrays only if lengths are different
  const prevAttachments = prevMessage.attachments || [];
  const nextAttachments = nextMessage.attachments || [];

  if (prevAttachments.length !== nextAttachments.length) {
    return false;
  }

  // Only do deep comparison if attachments exist
  if (prevAttachments.length > 0) {
    const attachmentsChanged =
      JSON.stringify(prevAttachments) !== JSON.stringify(nextAttachments);
    if (attachmentsChanged) return false;
  }

  return true;
};

interface MessageItemPropsExtended extends MessageItemProps {
  isSaraConversation?: boolean;
  otherParticipantName?: string;
}

export const MessageItem = React.memo<MessageItemPropsExtended>(
  ({
    message,
    currentUser,
    onRetryUpload,
    conversationId,
    isSaraConversation = false,
    otherParticipantName = 'Unknown',
  }) => {
    // Determine sender name based on whether it's Sara direct or Sara on behalf of someone
    const senderName =
      message.senderId === 'assistant'
        ? isSaraConversation
          ? 'Sara AI Assistant'
          : `Sara - on behalf of ${otherParticipantName}`
        : 'Me';

    return (
      <Message
        messageId={message.id}
        sender={senderName}
        text={message.text}
        timestamp={message.displayTimestamp || message.timestamp}
        isCurrentUser={message.senderId !== 'assistant'}
        attachments={message.attachments}
        isUploading={message.isUploading}
        uploadStatus={message.uploadStatus}
        onRetry={onRetryUpload}
        conversationId={conversationId}
      />
    );
  },
  messagePropsAreEqual
);

MessageItem.displayName = 'MessageItem';
