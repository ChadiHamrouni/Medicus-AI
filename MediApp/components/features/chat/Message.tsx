import React from 'react';
import { Animated, Text, View } from 'react-native';
import {
  AttachmentRenderer,
  Avatar,
  MarkdownText,
  MessageProps,
  MessageStatus,
  SaraLoader,
  useDisplaySender,
  useMessageAnimation,
  useMessageStyles,
} from './MessageComponents';
import TranscriptionLoader from './TranscriptionLoader';

const MessageComponent: React.FC<MessageProps> = ({
  sender,
  text,
  timestamp,
  isCurrentUser,
  avatar,
  attachments,
  isUploading,
  uploadStatus,
  onRetry,
  messageId,
  conversationId,
  isLoading,
}) => {
  const audioAttachments = attachments?.filter(
    att =>
      att.type === 'audio' ||
      (att.mimeType && att.mimeType.startsWith('audio/')) ||
      (att.name && att.name.match(/\.(m4a|mp4|mp3|wav|ogg|webm)$/i))
  );

  const hasAudio = audioAttachments && audioAttachments.length > 0;

  const isWaitingForTranscription =
    hasAudio && !text?.trim() && isCurrentUser && !isLoading;

  const visibleAttachments = isWaitingForTranscription
    ? attachments?.filter(a => !audioAttachments?.includes(a))
    : attachments;

  // Treat audio messages waiting for transcription as "sending"
  const effectiveIsUploading = isUploading || isLoading || isWaitingForTranscription;
  const effectiveUploadStatus = (isLoading || isWaitingForTranscription) ? 'sending' : uploadStatus;

  const fadeAnim = useMessageAnimation(
    effectiveIsUploading as boolean,
    effectiveUploadStatus as 'sending' | 'failed'
  );
  const displaySender = useDisplaySender(sender, isCurrentUser);

  const {
    messageBubbleClass,
    messageBubbleStyle,
    messageContainerStyle,
    messageContentClass,
    textClass,
  } = useMessageStyles(
    isCurrentUser,
    effectiveUploadStatus as 'sending' | 'failed',
    displaySender,
    fadeAnim
  );

  return (
    <Animated.View style={messageContainerStyle}>
      <Avatar
        isCurrentUser={isCurrentUser}
        avatar={avatar}
        displaySender={displaySender}
      />

      <View className={messageContentClass}>
        {!isCurrentUser && displaySender && (
          <Text
            className={`text-sm mb-1 ${displaySender.startsWith('Sara')
              ? 'text-orange-600 font-medium'
              : 'text-gray-700'
              }`}
          >
            {displaySender}
          </Text>
        )}
        {visibleAttachments && visibleAttachments.length > 0 && !isLoading && (
          <AttachmentRenderer
            attachments={visibleAttachments}
            uploadStatus={uploadStatus as 'sending' | 'failed'}
            messageId={messageId}
            conversationId={conversationId}
          />
        )}
        {(isLoading || text.trim() || isWaitingForTranscription) && (
          <View
            className={messageBubbleClass}
            style={messageBubbleStyle}
            testID={
              displaySender?.startsWith('Sara')
                ? 'sara-message-bubble'
                : isCurrentUser
                  ? 'user-message-bubble'
                  : 'message-bubble'
            }
          >
            {isLoading && displaySender?.startsWith('Sara') ? (
              <SaraLoader />
            ) : (isLoading || isWaitingForTranscription) &&
              isCurrentUser &&
              attachments &&
              attachments.length > 0 ? (
              <TranscriptionLoader />
            ) : text.trim() ? (
              displaySender?.startsWith('Sara') ? (
                <MarkdownText
                  isCurrentUser={isCurrentUser}
                  testID="sara-response-text"
                >
                  {text}
                </MarkdownText>
              ) : (
                <Text className={textClass}>{text}</Text>
              )
            ) : null}
          </View>
        )}

        <View className="flex-row items-center justify-end mt-1">
          <MessageStatus
            isUploading={effectiveIsUploading}
            uploadStatus={effectiveUploadStatus as 'sending' | 'failed'}
            timestamp={timestamp}
            onRetry={onRetry}
            messageId={messageId}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const Message = React.memo(MessageComponent, (prevProps, nextProps) => {
  return (
    prevProps.messageId === nextProps.messageId &&
    prevProps.text === nextProps.text &&
    prevProps.timestamp === nextProps.timestamp &&
    prevProps.isCurrentUser === nextProps.isCurrentUser &&
    prevProps.isUploading === nextProps.isUploading &&
    prevProps.uploadStatus === nextProps.uploadStatus &&
    prevProps.sender === nextProps.sender &&
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.isLoading === nextProps.isLoading &&
    JSON.stringify(prevProps.attachments) ===
    JSON.stringify(nextProps.attachments)
  );
});

Message.displayName = 'Message';

export default Message;
