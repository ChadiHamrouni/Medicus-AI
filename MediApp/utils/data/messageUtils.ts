import { Attachment, IMessage, ApiMessage, AppPayload } from '@/types';
import { logger } from '../infrastructure/logger';
import { env } from '../infrastructure/env';

/**
 * Formats timestamp into user-friendly chat message format
 */
export const formatMessageTimestamp = (timestamp: string): string => {
  const messageDate = new Date(timestamp);
  const now = new Date();

  // Check if the date is valid
  if (isNaN(messageDate.getTime())) {
    return 'Just now';
  }

  const diffInMilliseconds = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
  const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  // Just now (less than 1 minute)
  if (diffInMinutes < 1) {
    return 'Just now';
  }

  // Minutes ago (less than 1 hour)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Hours ago (less than 24 hours)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // Yesterday
  if (diffInDays === 1) {
    return `Yesterday ${messageDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  }

  // This week (2-6 days ago)
  if (diffInDays < 7) {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayName = dayNames[messageDate.getDay()];
    return `${dayName} ${messageDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  }

  // More than a week ago - show date
  if (diffInDays < 365) {
    return messageDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // More than a year ago - include year
  return messageDate.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Transforms API message to IMessage format
 */
export const transformApiMessageToIMessage = (
  apiMessage: ApiMessage,
  _currentUserId: string,
  fallback?: IMessage
): IMessage => {
  const { id, role, content, created_at } = apiMessage;

  // Generate unique ID from message id and timestamp
  // Handle WebSocket messages that may not have proper id/timestamp
  const messageId =
    id && created_at
      ? `api-${id}-${created_at}`
      : `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Determine message text
  let messageText = '';
  const attachments: Attachment[] = [];

  // Ensure content exists before accessing its properties
  if (!content) {
    logger.warn('ApiMessage content is undefined', {
      component: 'messageUtils',
      function: 'transformApiMessageToIMessage',
      messageId: id,
      role,
      created_at,
    });
    // Handle missing timestamp for WebSocket messages
    const fallbackTimestamp = created_at || new Date().toISOString();

    // Check if fallback has audio attachments
    const hasAudioInFallback =
      fallback?.attachments?.some(att => att.type === 'audio') || false;

    return {
      id: messageId,
      senderId:
        fallback?.senderId || (role === 'user' ? _currentUserId : 'assistant'),
      patientId: fallback?.patientId,
      text: fallback?.text || '⚠️ Message content unavailable',
      timestamp: fallbackTimestamp,
      displayTimestamp: formatMessageTimestamp(fallbackTimestamp),
      attachments: fallback?.attachments || [],
      // These fields are included for consistency
      isUploading: false,
      uploadStatus: 'sent',
      isTemporary: false,
      isFailed: false,
      // Keep audio messages in loading state
      isLoading: hasAudioInFallback,
    };
  }

  // Get text content from either payload type
  const c: any = content as any;

  if (c.text_io) {
    messageText = c.text_io as string;
  }
  // Also check for 'body' field which is used by AI responses
  if (!messageText && c.body) {
    messageText = c.body as string;
  }
  // Support CloudPayload.message for assistant responses
  if (!messageText && (content as any).type === 'cloud') {
    const maybeMsg = (content as any).message;
    if (typeof maybeMsg === 'string' && maybeMsg.length > 0) {
      messageText = maybeMsg;
    }
  }

  // Handle audio attachments
  if (c.audio_io && !messageText && !c.text_io) {
    const mediaContentType = c.media_content_type || 'audio/m4a';
    const mediaFilename = c.media_filename || 'Audio Message';
    // Try to get convo_id from content first, then from apiMessage
    const convoId = (c as any).convo_id || (apiMessage as any).conversation_id;

    // Construct audio URI using MedicusConvo stream endpoint for Azure blob
    let audioUri = c.audio_io as string;
    if (c.audio_io && convoId) {
      const baseUrl = env.medicusConvoApiBaseUrl;
      const blobPath = (c as any).blob_path || c.audio_io;
      audioUri = `${baseUrl}/conversations/${convoId}/media/${blobPath}/stream`;
    }

    attachments.push({
      uri: audioUri,
      type: 'audio',
      name: mediaFilename,
      mimeType: mediaContentType,
    });
    messageText = '🎵 Audio Message';
  }

  // Handle multiple media attachments from Azure blob storage
  const multiAttachments = (c as any).attachments;
  const hasMultipleAttachments = multiAttachments && Array.isArray(multiAttachments) && multiAttachments.length > 0;

  logger.info('[messageUtils] Checking attachments', {
    component: 'transformApiMessageToIMessage',
    messageId: apiMessage.id,
    hasMultipleAttachments,
    multiAttachments,
    contentKeys: Object.keys(c as any),
  });

  // Process the attachments array (already declared above)
  if (hasMultipleAttachments) {
    const convoId = (apiMessage as any).conversation_id;

    logger.info('[messageUtils] Processing attachments', {
      component: 'transformApiMessageToIMessage',
      attachmentsCount: multiAttachments.length,
      firstAttachment: multiAttachments[0],
      attachmentTypes: multiAttachments.map((a: any) => typeof a),
    });

    multiAttachments.forEach((att: any, index: number) => {
      logger.info('[messageUtils] Processing attachment', {
        component: 'transformApiMessageToIMessage',
        index,
        attType: typeof att,
        attKeys: typeof att === 'object' ? Object.keys(att) : 'N/A',
        att,
      });

      // Handle new format: attachments is array of objects with blob_path, content_type, filename
      if (typeof att === 'object' && att !== null && att.blob_path) {
        const blobPath = att.blob_path;
        let mediaUri = blobPath;

        // Construct stream URL for blob storage
        if (convoId) {
          const baseUrl = env.medicusConvoApiBaseUrl;
          mediaUri = `${baseUrl}/conversations/${convoId}/media/${blobPath}/stream`;
        }

        // Detect type using content_type from metadata (most reliable)
        const contentType = att.content_type || '';
        const filename = att.filename || '';
        
        const isImage =
          contentType.startsWith('image/') ||
          filename.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i) ||
          blobPath.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|dicom|dcm)$/i);

        const isPdf =
          contentType.startsWith('application/pdf') ||
          filename.endsWith('.pdf') ||
          blobPath.endsWith('.pdf');

        const attachmentType = isImage ? 'image' : 'file';
        const attachmentName = filename || (isImage ? `Image ${index + 1}` : isPdf ? 'PDF Document' : `Attachment ${index + 1}`);

        logger.info('[messageUtils] Created attachment (object format)', {
          component: 'transformApiMessageToIMessage',
          type: attachmentType,
          name: attachmentName,
          uri: mediaUri,
          contentType,
        });

        attachments.push({
          uri: mediaUri,
          type: attachmentType,
          name: attachmentName,
          mimeType: contentType || (isImage ? 'image/jpeg' : 'application/octet-stream'),
        });
        return;
      }

      // Handle legacy format: attachments is array of blob path strings
      if (typeof att === 'string') {
        const blobPath = att;
        let mediaUri = blobPath;

        // Construct stream URL for blob storage
        if (convoId) {
          const baseUrl = env.medicusConvoApiBaseUrl;
          mediaUri = `${baseUrl}/conversations/${convoId}/media/${blobPath}/stream`;
        }

        // Get content metadata for type detection (from message content)
        const mediaContentType = c.media_content_type || '';
        const mediaFilename = c.media_filename || '';

        // Detect type using same logic as file_io handler
        const isImage =
          mediaContentType.startsWith('image/') ||
          mediaFilename.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i) ||
          blobPath.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|dicom|dcm)$/i);

        const isPdf =
          mediaContentType.startsWith('application/pdf') ||
          mediaFilename.endsWith('.pdf') ||
          blobPath.endsWith('.pdf');

        const attachmentType = isImage ? 'image' : 'file';
        const attachmentName = isImage
          ? (mediaFilename || `Image ${index + 1}`)
          : isPdf
          ? (mediaFilename || 'PDF Document')
          : (mediaFilename || `Attachment ${index + 1}`);

        attachments.push({
          uri: mediaUri,
          type: attachmentType,
          name: attachmentName,
          mimeType: mediaContentType || (isImage ? 'image/jpeg' : 'application/octet-stream'),
        });
        return;
      }

      // Handle legacy format: attachments is array of objects with status, blob_url, etc.
      if (att.status !== 'completed' || !att.blob_url) return;

      let mediaUri = att.blob_url;
      if (convoId) {
        const baseUrl = env.medicusConvoApiBaseUrl;
        const blobPath = att.blob_path || att.blob_url;
        mediaUri = `${baseUrl}/conversations/${convoId}/media/${blobPath}/stream`;
      }

      // More comprehensive image detection
      const isImage =
        att.content_type?.startsWith('image/') ||
        att.filename?.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i) ||
        att.blob_path?.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i) ||
        att.blob_url?.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i);

      attachments.push({
        uri: mediaUri,
        type: isImage ? 'image' : 'file',
        name: att.filename || `Attachment ${index + 1}`,
        mimeType:
          att.content_type ||
          (isImage ? 'image/jpeg' : 'application/octet-stream'),
      });
    });
  }

  // Determine sender ID based on role field from database
  let senderId: string;
  let patientId: string | undefined;

  if (role === 'user') {
    if (content.type === 'app') {
      const appContent = content as AppPayload;
      // Use sender_id (profile ID) for senderId to match temp messages
      senderId = appContent.sender_id ? appContent.sender_id.toString() : 'user';
      patientId = appContent.sender_id ? appContent.sender_id.toString() : undefined;
    } else {
      senderId = 'user';
    }
  } else if (role === 'assistant') {
    senderId = 'assistant';
  } else {
    senderId = 'unknown';
  }

  // Handle missing timestamp for WebSocket messages
  const messageTimestamp = created_at || new Date().toISOString();

  // Check if this message has an audio attachment (waiting for transcription)
  const hasAudioAttachment = attachments.some(att => att.type === 'audio');

  // Don't display whitespace-only text when there are attachments
  const displayText = (attachments.length > 0 && messageText.trim() === '') ? '' : messageText;

  return {
    id: messageId,
    senderId,
    patientId,
    text: displayText,
    timestamp: messageTimestamp,
    displayTimestamp: formatMessageTimestamp(messageTimestamp),
    attachments: attachments.length > 0 ? attachments : undefined,
    // Add status fields for consistency
    isUploading: false,
    uploadStatus: 'sent',
    isTemporary: false,
    isFailed: false,
    // Keep audio messages in loading state until transcription arrives
    isLoading: hasAudioAttachment,
  };
};

/**
 * Transforms array of API messages to IMessage array
 */
export const transformApiMessagesToIMessages = (
  apiMessages: ApiMessage[],
  currentUserId: string,
  fallbackMap?: Record<string, IMessage>
): IMessage[] => {
  return apiMessages
    .map(apiMessage => {
      const fallback = fallbackMap?.[apiMessage.id];
      // Only show messages with content or a fallback
      if (!apiMessage.content && !fallback) return null;
      return transformApiMessageToIMessage(apiMessage, currentUserId, fallback);
    })
    .filter(Boolean) as IMessage[];
};

/**
 * Sorts messages by timestamp with user messages always before AI responses
 */
export const sortMessagesByTimestamp = (messages: IMessage[]): IMessage[] => {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();

    // If timestamps are very close (within 5 seconds), ensure user messages come before AI
    const timeDiff = Math.abs(timeA - timeB);
    if (timeDiff < 5000) {
      const aIsUser = a.senderId !== 'assistant' && a.senderId !== 'ai';
      const bIsUser = b.senderId !== 'assistant' && b.senderId !== 'ai';

      // If one is user and one is AI, user comes first
      if (aIsUser && !bIsUser) return -1;
      if (!aIsUser && bIsUser) return 1;
    }

    // Otherwise sort by timestamp
    return timeA - timeB;
  });
};

/**
 * Merges new messages with existing messages, avoiding duplicates
 */
export const mergeMessages = (
  existingMessages: IMessage[],
  newMessages: IMessage[]
): IMessage[] => {
  const existingIds = new Set(existingMessages.map(msg => msg.id));
  const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));

  return sortMessagesByTimestamp([...existingMessages, ...uniqueNewMessages]);
};

/**
 * Gets the oldest message timestamp for pagination
 */
export const getOldestMessageTimestamp = (
  messages: IMessage[]
): string | undefined => {
  if (messages.length === 0) return undefined;

  const sorted = sortMessagesByTimestamp(messages);
  return sorted[0]?.timestamp;
};

/**
 * Creates a temporary message for optimistic UI updates
 */
export const createTemporaryMessage = (
  text: string,
  senderId: string,
  attachments?: Attachment[]
): IMessage => {
  const tempId = `temp-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const now = new Date().toISOString();

  return {
    id: tempId,
    senderId,
    text: text || '', // No default text for attachments - show attachment only
    timestamp: now,
    // displayTimestamp: "Sending...", // Temporarily commented out
    attachments,
    isUploading: true,
    uploadStatus: 'sending',
    isTemporary: true,
    isFailed: false,
    createdAt: now,
  };
};

/**
 * Updates a temporary message with the real API response - ENHANCED VERSION
 */
export const updateTemporaryMessage = (
  tempMessage: IMessage,
  apiMessage: ApiMessage,
  currentUserId: string
): IMessage => {
  const realMessage = transformApiMessageToIMessage(
    apiMessage,
    currentUserId,
    tempMessage
  );

  return {
    ...realMessage,
    // Keep the temp message ID to ensure we update the right message
    id: tempMessage.id,
    // Add the real API message ID for reference
    realMessageId: apiMessage.id.toString(),
    // Preserve original attachments if no new ones from API
    attachments: realMessage.attachments || tempMessage.attachments,
    // Clear temporary status - MESSAGE IS NOW SENT
    isUploading: false,
    uploadStatus: 'sent',
    isTemporary: false,
    isFailed: false,
    displayTimestamp: undefined, // Remove "Sending..." text - use normal timestamp
  };
};

/**
 * Marks a temporary message as failed
 */
export const markMessageAsFailed = (tempMessage: IMessage): IMessage => {
  return {
    ...tempMessage,
    displayTimestamp: 'Failed to send',
    isUploading: false,
    uploadStatus: 'failed',
    isFailed: true,
    isTemporary: true, // Keep as temporary so we can retry if needed
  };
};

/**
 * Gets the newest message timestamp for real-time updates
 */
export const getNewestMessageTimestamp = (
  messages: IMessage[]
): string | undefined => {
  if (messages.length === 0) return undefined;

  const sorted = sortMessagesByTimestamp(messages);
  return sorted[sorted.length - 1]?.timestamp;
};

/**
 * Helper to determine if a message is currently being sent
 */
export const isMessageSending = (message: IMessage): boolean => {
  return (
    message.uploadStatus === 'sending' ||
    message.isUploading === true ||
    (message.isTemporary === true && message.isFailed !== true)
  );
};

/**
 * Helper to determine if a message failed to send
 */
export const isMessageFailed = (message: IMessage): boolean => {
  return message.uploadStatus === 'failed' || message.isFailed === true;
};

/**
 * Helper to get the display status of a message
 */
export const getMessageStatus = (
  message: IMessage
): 'sent' | 'sending' | 'failed' => {
  if (isMessageSending(message)) {
    return 'sending';
  }
  if (isMessageFailed(message)) {
    return 'failed';
  }
  return 'sent';
};

/**
 * Helper to get display text for message status
 */
export const getMessageDisplayText = (
  message: IMessage
): string | undefined => {
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
};
