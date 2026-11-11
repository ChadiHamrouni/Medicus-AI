/**
 * TanStack Query mutation hooks for message sending
 */

import {
  MedicusAIRequest,
  sendAudioToSara,
  sendTextToSara,
  getConvoStatus,
} from '@/services/medicusAI';
import { sendMessage } from '@/services';
import { Attachment, SendMessageRequest, ApiMessage } from '@/types';
import { logger } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface AttachmentObject {
  blob_path: string;
  content_type: string;
  filename: string;
  size?: number;
}

export interface SendTextMessagePayload {
  chatId: string;
  text: string;
  senderId: number;
  userId?: number; // User account ID for deduplication
  patientId?: number; // Patient context for AI
  doctorId?: number | null; // Doctor context for AI
  receiverId: number;
  assistant: string;
  attachments?: AttachmentObject[]; // Attachment objects with metadata (shared with doctor)
  audio_io?: string; // Blob storage path for audio (NOT shared with doctor)

  file_io?: string;
  blob_url?: string;
  blob_path?: string;
  media_filename?: string;
  media_content_type?: string;
  has_media?: boolean;
  storage_status?: string;

  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface SendLocationMessagePayload {
  chatId: string;
  senderId: number;
  receiverId: number;
  assistant: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface SendAudioToSaraPayload {
  chatId: string;
  senderId: number;
  receiverId: number;
  assistant: string;
  audioSid: string; // Media SID from the uploaded audio
  location?: {
    latitude: number;
    longitude: number;
  };
  messageId?: number; // Backend message ID for correlation
}

export interface SendTextToSaraPayload {
  chatId: string;
  senderId: number;
  receiverId: number;
  patientId?: number | null;
  doctorId?: number | null;
  assistant: string;
  text: string;
  convoStatus: 'NEW' | 'ACTIVE' | 'INACTIVE';
  location?: {
    latitude: number;
    longitude: number;
  };
  messageId?: number;
  audioSid?: string;
  attachments?: AttachmentObject[];
  mirrorConvoId?: string | null;
  // Compaction — AI long-term memory (from ConversationContext)
  compactSummary?: string | null;
  compactToMessage?: number | null;
  // Rolling context window — last N [user, assistant] pairs since last compaction
  recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }> | null;
}

/**
 * Hook to send text message with optional attachments
 */
export function useSendTextMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: SendTextMessagePayload
    ): Promise<ApiMessage> => {
      logger.info('Send text message attempt started', {
        component: 'useSendTextMessage',
        chatId: payload.chatId,
        senderId: payload.senderId,
        attachments: payload.attachments?.length || 0,
        hasLocation: Boolean(payload.location),
      });

      // Prepare message request
      const requestPayload: any = {
        user_id: payload.userId || payload.senderId,
        sender_id: payload.senderId,
        patient_id: payload.patientId,
        doctor_id: payload.doctorId,
        assistant: payload.assistant,
        convo_id: payload.chatId,
        convo_status: 'ACTIVE',
        receiver_id: payload.receiverId,
        direct_message: false,
        text_io: payload.text,
        location: payload.location || {
          latitude: -90,
          longitude: -180,
        },
      };

      if (payload.file_io) requestPayload.file_io = payload.file_io;
      if (payload.blob_url) requestPayload.blob_url = payload.blob_url;
      if (payload.blob_path) requestPayload.blob_path = payload.blob_path;
      if (payload.media_filename) requestPayload.media_filename = payload.media_filename;
      if (payload.media_content_type) requestPayload.media_content_type = payload.media_content_type;
      if (typeof payload.has_media === 'boolean') requestPayload.has_media = payload.has_media;
      if (payload.storage_status) requestPayload.storage_status = payload.storage_status;

      const request: SendMessageRequest = {
        payload: requestPayload,
      };

      // Use audio_io if provided (from Azure blob upload - NOT shared with doctor)
      if (payload.audio_io) {
        request.payload.audio_io = payload.audio_io;
      }

      // Add attachments array (blob paths for images/PDFs)
      if (payload.attachments && payload.attachments.length > 0) {
        request.payload.attachments = payload.attachments;
      }

      const response = await sendMessage(payload.chatId, request);

      // Validate the response structure
      if (!response || typeof response !== 'object') {
        throw new Error(
          'Invalid response from server: response is not an object'
        );
      }

      if (!response.id || !response.role || !response.created_at) {
        logger.warn('Incomplete response from server', {
          component: 'useSendTextMessage',
          chatId: payload.chatId,
          response,
        });
      }

      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Text message sent successfully', {
        component: 'useSendTextMessage',
        chatId: variables.chatId,
        messageId: data.id,
        receiverId: (data.content as any).receiver_id || variables.receiverId,
      });

      // Invalidate all message queries for this conversation
      logger.info('Invalidating message queries from mutation', {
        component: 'useSendTextMessage',
        chatId: variables.chatId,
        queryKey: ['messages', 'conversation', variables.chatId],
      });
      // Don't invalidate queries - let WebSocket handle real-time updates
    },
    onError: (error, variables) => {
      logger.error('Failed to send text message', error as Error, {
        component: 'useSendTextMessage',
        chatId: variables.chatId,
        text: variables.text,
        attachments: variables.attachments?.length || 0,
      });
    },
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.message.includes('Authentication failed')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

/**
 * Hook to send location message
 */
export function useSendLocationMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: SendLocationMessagePayload
    ): Promise<ApiMessage> => {
      logger.info('Send location message attempt started', {
        component: 'useSendLocationMessage',
        chatId: payload.chatId,
        senderId: payload.senderId,
        location: payload.location,
      });

      // Prepare message request
      const request: SendMessageRequest = {
        payload: {
          user_id: payload.senderId,
          sender_id: payload.senderId,
          assistant: payload.assistant,
          convo_id: payload.chatId,
          convo_status: 'ACTIVE',
          receiver_id: payload.receiverId,
          direct_message: false,
          location: payload.location,
        },
      };

      const response = await sendMessage(payload.chatId, request);

      // Validate the response structure
      if (!response || typeof response !== 'object') {
        throw new Error(
          'Invalid response from server: response is not an object'
        );
      }

      if (!response.id || !response.role || !response.created_at) {
        logger.warn('Incomplete response from server', {
          component: 'useSendLocationMessage',
          chatId: payload.chatId,
          response,
        });
      }

      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Location message sent successfully', {
        component: 'useSendLocationMessage',
        chatId: variables.chatId,
        messageId: data.id,
        receiverId: (data.content as any).receiver_id || variables.receiverId,
      });

      // Invalidate all message queries for this conversation
      // Don't invalidate queries - let WebSocket handle real-time updates
    },
    onError: (error, variables) => {
      logger.error('Failed to send location message', error as Error, {
        component: 'useSendLocationMessage',
        chatId: variables.chatId,
        location: variables.location,
      });
    },
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.message.includes('Authentication failed')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

/**
 * Hook to send audio message to Sara AI
 * This will upload the audio and send it to MedicusAI for processing
 */
export function useSendAudioToSaraMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendAudioToSaraPayload) => {
      logger.info('Send audio to Sara attempt started', {
        component: 'useSendAudioToSara',
        chatId: payload.chatId,
        senderId: payload.senderId,
        audioSid: payload.audioSid,
        assistant: payload.assistant,
      });

      // Prepare MedicusAI request
      const medicusAIRequest: MedicusAIRequest = {
        payload: {
          type: 'app',
          user_id: payload.senderId,
          sender_id: payload.senderId,
          assistant: payload.assistant,
          convo_id: payload.chatId,
          convo_status: 'ACTIVE',
          receiver_id: payload.receiverId,
          direct_message: false,
          audio_io: payload.audioSid,
          location: payload.location,
          message_id: payload.messageId,
        },
      };

      // Send to MedicusAI for Sara processing
      const response = await sendAudioToSara(medicusAIRequest);

      if (response.status_code !== 200) {
        throw new Error(
          response.message || 'Failed to process audio with Sara AI'
        );
      }

      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Audio sent to Sara successfully', {
        component: 'useSendAudioToSara',
        chatId: variables.chatId,
        statusCode: data.status_code,
        senderId: variables.senderId,
      });

      // Invalidate message queries to refresh the conversation
      // Sara's response should appear through WebSocket
      // Don't invalidate queries - let WebSocket handle real-time updates
    },
    onError: (error, variables) => {
      logger.error('Failed to send audio to Sara', error as Error, {
        component: 'useSendAudioToSara',
        chatId: variables.chatId,
        audioSid: variables.audioSid,
        assistant: variables.assistant,
      });
    },
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.message.includes('Authentication failed')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

/**
 * Hook to send text message to Sara AI
 * This will send the text to MedicusAI for processing by Sara
 */
export function useSendTextToSaraMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // Never auto-retry: the server keeps running the turn after a client timeout, so a retry
    // runs the agent twice and can repeat its actions (bookings, prescriptions).
    retry: false,
    mutationFn: async (payload: SendTextToSaraPayload) => {
      logger.info('Send text to Sara attempt started', {
        component: 'useSendTextToSara',
        chatId: payload.chatId,
        senderId: payload.senderId,
        textLength: payload.text.length,
        assistant: payload.assistant,
      });

      // Prepare MedicusAI request
      const medicusAIRequest: MedicusAIRequest = {
        payload: {
          type: 'app',
          user_id: payload.senderId,
          sender_id: payload.senderId,
          assistant: payload.assistant,
          convo_id: payload.chatId,
          convo_status: payload.convoStatus,
          receiver_id: payload.receiverId,
          patient_id: payload.patientId,
          doctor_id: payload.doctorId,
          direct_message: false,
          text_io: payload.text,
          audio_io: payload.audioSid,
          attachments: payload.attachments,
          location: payload.location,
          message_id: payload.messageId,
          mirror_convo_id: payload.mirrorConvoId,
          compact_summary: payload.compactSummary,
          compact_to_message: payload.compactToMessage,
          recent_messages: payload.recentMessages,
        },
      };

      // Send to MedicusAI for Sara processing
      const response = await sendTextToSara(medicusAIRequest);

      if (response.status_code !== 200) {
        throw new Error(
          response.message || 'Failed to process text with Sara AI'
        );
      }

      return response;
    },
    onSuccess: (data, variables) => {
      logger.info('Text sent to Sara successfully', {
        component: 'useSendTextToSara',
        chatId: variables.chatId,
        statusCode: data.status_code,
        senderId: variables.senderId,
      });

      // Invalidate message queries to refresh the conversation
      // Sara's response should appear through WebSocket
      // Don't invalidate queries - let WebSocket handle real-time updates
    },
    onError: (error, variables) => {
      logger.error('Failed to send text to Sara', error as Error, {
        component: 'useSendTextToSara',
        chatId: variables.chatId,
        textLength: variables.text.length,
        assistant: variables.assistant,
      });
    },
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.message.includes('Authentication failed')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}
