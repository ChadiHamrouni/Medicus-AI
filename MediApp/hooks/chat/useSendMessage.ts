import {
  useSendTextMessageMutation,
  useSendTextToSaraMutation,
} from './mutations/useMessageMutations';
import { useAuth } from '../auth/useAuth';
import { useConversationContextQuery } from './queries/useConversationsQueries';
import { type Conversation } from '@/types';
import { Attachment } from '@/types';
import { getConvoStatus } from '@/services/medicusAI';
import { logger, createTemporaryMessage } from '@/utils';
import { useCallback, useEffect, useRef } from 'react';


// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Resolve MIME type from file name and attachment type
 */
function resolveMimeType(
  fileName: string | undefined,
  attachmentType: string,
  providedMimeType?: string
): string {
  if (providedMimeType === 'audio/m4a') return 'audio/mp4';
  if (providedMimeType) return providedMimeType;

  const extension = fileName?.split('.').pop()?.toLowerCase();

  // Audio files
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'wav') return 'audio/wav';

  // Image files
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'webp') return 'image/webp';

  // Document files (PDF)
  if (extension === 'pdf') return 'application/pdf';

  // Type-based fallback
  if (attachmentType === 'audio') return 'audio/mp4';
  if (attachmentType === 'image') return 'image/jpeg';
  if (attachmentType === 'file') return 'application/pdf'; // Default file type to PDF

  return 'application/octet-stream';
}

/**
 * Create temporary message data structure
 */
function createTempMessageData(
  text: string,
  senderId: string,
  attachments?: Attachment[],
  patientId?: string
) {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  return {
    ...createTemporaryMessage(text, senderId, attachments),
    id: tempId,
    patientId,
    uploadStatus: 'sending' as const,
    isUploading: true,
    isFailed: false,
    displayTimestamp: attachments?.length
      ? 'Uploading attachments...'
      : undefined,
    isTemporary: true,
    createdAt: new Date().toISOString(),
    isLoading: attachments?.some(att => att.type === 'audio') || false,
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

interface UseSendMessageProps {
  conversation: Conversation | null;
  currentUserId: string;
  addTemporaryMessage: (_message: any) => void;
  updateMessage: (_messageId: string, _updates: any) => void;
  onError: (_title: string, _message: string) => void;
  isSaraConversation?: boolean; // Optional, kept for backward compatibility but not used
}

interface UseSendMessageReturn {
  sendTextMessage: (
    _text: string,
    _attachments?: Attachment[]
  ) => Promise<void>;
  receiverId: number;
  isLoading: boolean;
}

interface UploadResult {
  id: number;
  content?: {
    audio_io?: string;
    file_io?: string;
  };
}

// ============================================================================
// Main Hook
// ============================================================================

export const useSendMessage = ({
  conversation,
  currentUserId,
  addTemporaryMessage,
  updateMessage,
  onError,
  isSaraConversation: _isSaraConversation,
}: UseSendMessageProps): UseSendMessageReturn => {
  const { authState } = useAuth();
  const sendTextMutation = useSendTextMessageMutation();
  const sendTextToSaraMutation = useSendTextToSaraMutation();

  // Fetch AI context (compaction state) on conversation open.
  // Future: will check device SQLite cache before hitting the network.
  const { data: convoContext } = useConversationContextQuery(conversation?.id ?? null);

  // Deduplication tracking
  const lastSentMessageIdRef = useRef<string | null>(null);

  // Rolling context window — accumulates [user, assistant] pairs since last compaction.
  // Reset when conversation changes or compaction fires (compact_summary changes).
  const recentMessagesRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const lastCompactSummaryRef = useRef<string | null | undefined>(convoContext?.compact_summary);

  // Reset window when conversation changes
  useEffect(() => {
    recentMessagesRef.current = [];
    lastCompactSummaryRef.current = convoContext?.compact_summary;
  }, [conversation?.id]);

  // Reset window when compaction fires (compact_summary changes)
  useEffect(() => {
    if (convoContext?.compact_summary !== lastCompactSummaryRef.current) {
      recentMessagesRef.current = [];
      lastCompactSummaryRef.current = convoContext?.compact_summary;
    }
  }, [convoContext?.compact_summary]);

  // Derived values - handle null/undefined with fallback
  const receiverId =
    (authState.user?.role === 'patient'
      ? conversation?.doctor_id
      : conversation?.patient_id) ?? 0;

  const assistant =
    conversation?.assistant?.trim().toLowerCase() ||
    (authState.user?.role === 'patient' ? 'mediaid' : 'medidoc');

  // Helper: Check if this is a Sara conversation (AI-only, no doctor/patient)
  const isSaraConvo = useCallback(() => {
    if (!conversation) return false;

    // Sara conversations are identified by:
    // 1. Both patient_id and doctor_id are null/undefined, OR
    // 2. assistant type is 'mediaid' or 'medidoc' AND one of the IDs is null
    const hasNoDoctor = !conversation.doctor_id || conversation.doctor_id === 0;
    const hasNoPatient =
      !conversation.patient_id || conversation.patient_id === 0;

    return hasNoDoctor || hasNoPatient;
  }, [conversation]);


  const uploadToVault = useCallback(
    async (attachment: Attachment): Promise<{
      blob_path: string;
      blob_url: string;
      filename: string;
      mimeType: string;
      doc_external_id: string
    }> => {
      const ownerType = authState.user?.role || 'patient';
      const ownerId =
        ownerType === 'patient'
          ? authState.patientProfile?.id
          : authState.doctorProfile?.id;

      if (!ownerId) {
        throw new Error('User profile not found for upload');
      }

      const formData = new FormData();
      const fileName =
        attachment.name ||
        `attachment_${Date.now()}.${attachment.type === 'image' ? 'jpg' : 'bin'}`;
      const mimeType = resolveMimeType(
        fileName,
        attachment.type,
        attachment.mimeType
      );

      const file = {
        uri: attachment.uri,
        type: mimeType,
        name: fileName,
      } as any;

      formData.append('file', file);
      formData.append('owner_type', ownerType);
      formData.append('owner_id', ownerId.toString());

      const { env, authenticatedFetch } = await import('@/utils');
      const uploadUrl = `${env.medicusUserApiBaseUrl.replace(/\/$/, '')}/docs/upload`;

      const uploadPromise = authenticatedFetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Upload timeout after 60 seconds')),
          60000
        );
      });

      const response = (await Promise.race([
        uploadPromise,
        timeoutPromise,
      ])) as Response;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Vault upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return {
        blob_path: data.blob_path,
        blob_url: data.blob_url,
        filename: data.original_name,
        mimeType: mimeType,
        doc_external_id: data.doc_external_id,
      };
    },
    [authState.user, authState.patientProfile, authState.doctorProfile]
  );

  // ============================================================================
  // Share Document with Conversation
  // ============================================================================

  const shareVaultDocument = useCallback(
    async (doc_external_id: string, conversation_id: string): Promise<void> => {
      const ownerType = authState.user?.role || 'patient';

      const body = {
        doc_external_id,
        conversation_id,
        owner_type: ownerType
      };

      const { env, authenticatedFetch } = await import('@/utils');
      const shareUrl = `${env.medicusUserApiBaseUrl.replace(/\/$/, '')}/docs/share`;

      const response = await authenticatedFetch(shareUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Don't fail for solo conversations (no doctor to share with) - 404 is expected
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        if (response.status === 404) {
          console.log('[SHARE] Skipping share - solo conversation (no doctor)');
          return; // Gracefully skip sharing for solo Sara conversations
        }
        console.warn('Failed to share document', errorText);
        throw new Error(`Share failed: ${response.status} - ${errorText}`);
      }
    },
    [authState.user]
  );

  // ============================================================================
  // Upload Single Attachment
  // ============================================================================

  const uploadAttachment = useCallback(
    async (
      attachment: Attachment,
      text: string,
      chatId: string
    ): Promise<UploadResult> => {
      const formData = new FormData();
      const fileName =
        attachment.name ||
        `attachment_${Date.now()}.${attachment.type === 'image' ? 'jpg' : 'bin'}`;
      const mimeType = resolveMimeType(
        fileName,
        attachment.type,
        attachment.mimeType
      );

      const file = {
        uri: attachment.uri,
        type: mimeType,
        name: fileName,
      } as any;

      formData.append('file', file);
      formData.append(
        'message_text',
        text ||
        (attachment.type === 'audio' ? 'Voice message' : 'File attachment')
      );

      const { env, authenticatedFetch } = await import('@/utils');
      const uploadUrl = `${env.medicusConvoApiBaseUrl.replace(/\/$/, '')}/conversations/${chatId}/messages/upload`;

      const response = await authenticatedFetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    },
    []
  );

  // ============================================================================
  // Send to Sara AI
  // ============================================================================

  const sendToSaraAI = useCallback(
    async (
      messageId: number | string,
      text: string,
      senderId: number,
      audioSid?: string,
      fileSid?: string,
      attachments?: any[]
    ): Promise<void> => {
      if (!conversation) {
        console.error('[SEND_TO_SARA] ❌ No conversation available');
        return;
      }

      const saraKey = `${conversation.id}:${messageId}`;

      // Prevent duplicate sends
      if (lastSentMessageIdRef.current === saraKey) {
        console.warn('[SEND_TO_SARA] ⏭️ Duplicate send prevented', {
          messageId,
        });
        logger.warn('Duplicate Sara send prevented', { messageId });
        return;
      }

      if (sendTextToSaraMutation.isPending) {
        console.warn('[SEND_TO_SARA] ⏭️ Mutation already in flight');
        logger.warn('Sara mutation already in flight');
        return;
      }

      lastSentMessageIdRef.current = saraKey;

      // Add Sara loading message
      const saraLoadingId = `sara_loading_${Date.now()}`;
      addTemporaryMessage({
        id: saraLoadingId,
        senderId: 'assistant',
        text: '',
        timestamp: new Date().toISOString(),
        isLoading: true,
        isTemporary: true,
        uploadStatus: 'sending',
      });

      // Determine which AI assistant to call based on sender's role
      // Doctor sends → use medidoc (medibrief)
      // Patient sends → use mediaid (patient AI)
      const senderAssistant =
        authState.user?.role === 'doctor' ? 'medidoc' : 'mediaid';

      // Always send patient/doctor IDs - backend needs them for every message
      const contextPatientId = conversation.patient_id;
      const contextDoctorId = conversation.doctor_id;

      // CRITICAL: For solo Sara conversations (doctor or patient talking to Sara alone),
      // we must still pass the sender's ID so Sara knows who is talking.
      // - Doctor solo with Sara (medidoc): Send doctor_id from authState.doctorProfile
      // - Patient solo with Sara (mediaid): Send patient_id from authState.patientProfile
      let finalDoctorId = contextDoctorId;
      let finalPatientId = contextPatientId;

      if (isSaraConvo()) {
        if (authState.user?.role === 'doctor' && authState.doctorProfile?.id) {
          finalDoctorId = authState.doctorProfile.id;
        } else if (authState.user?.role === 'patient') {
          // For patients: Use conversation's patient_id (handles dependents correctly)
          // The conversation.patient_id is already the correct patient (dependent or main)
          finalPatientId = conversation.patient_id || authState.patientProfile?.id;
        }
      }

      const userText = text || 'Media message';

      try {
        const saraResponse = await sendTextToSaraMutation.mutateAsync({
          chatId: conversation.id,
          text: userText,
          senderId,
          receiverId,
          patientId: finalPatientId || undefined,
          doctorId: finalDoctorId || undefined,
          assistant: senderAssistant,
          location: { latitude: -90, longitude: -180 },
          messageId:
            typeof messageId === 'string' ? parseInt(messageId, 10) : messageId,
          audioSid,
          attachments,
          mirrorConvoId: conversation.mirror_conversation_id,
          convoStatus: getConvoStatus(conversation),
          compactSummary: convoContext?.compact_summary ?? null,
          compactToMessage: convoContext?.compact_to_message ?? null,
          recentMessages: recentMessagesRef.current.length > 0 ? recentMessagesRef.current : null,
        });

        // Append this turn to the rolling window (bounded by server-side compaction)
        recentMessagesRef.current = [
          ...recentMessagesRef.current,
          { role: 'user' as const, content: userText },
          { role: 'assistant' as const, content: saraResponse.text_io ?? '' },
        ];

        logger.info('Sara AI message sent', { messageId, senderAssistant });
      } catch (error) {
        console.error('[SEND_TO_SARA] ❌ Sara AI send failed', {
          messageId,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.error('Sara AI send failed', error as Error, { messageId });
        lastSentMessageIdRef.current = null; // Reset on failure
        throw error;
      }
    },
    [
      conversation,
      receiverId,
      authState.user,
      authState.doctorProfile,
      authState.patientProfile,
      sendTextToSaraMutation,
      addTemporaryMessage,
      isSaraConvo,
    ]
  );

  // ============================================================================
  // Main Send Function
  // ============================================================================

  const sendTextMessage = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      console.log('[SEND_MESSAGE] Starting send', {
        hasAuth: !!authState.user,
        hasConversation: !!conversation,
        conversationId: conversation?.id?.substring(0, 8),
        assistant: assistant,
        text: text?.substring(0, 50),
        hasAttachments: !!attachments?.length,
      });

      if (!authState.user) {
        console.error('[SEND_MESSAGE] ❌ No authenticated user');
        onError('Send Error', 'User not authenticated');
        return;
      }

      if (!conversation) {
        console.error('[SEND_MESSAGE] ❌ No active conversation');
        onError('Send Error', 'No active conversation');
        return;
      }

      // Determine sender based on user role
      const userId = authState.user.id;
      let senderId: number;

      if (authState.user.role === 'patient') {
        // For patients: use patient profile ID (handles dependents correctly)
        senderId = conversation.patient_id || authState.patientProfile?.id || userId;
      } else {
        // For doctors: use doctor profile ID
        senderId = authState.doctorProfile?.id || userId;
      }

      const tempMessage = createTempMessageData(
        text,
        senderId.toString(), // Use profile ID for consistency with Socket.IO
        attachments,
        conversation.patient_id?.toString()
      );

      addTemporaryMessage(tempMessage);

      try {
        let response;
        let finalAttachments: { blob_path: string; content_type: string; filename: string }[] | undefined;

        const hasAudio = attachments?.some(att => att.type === 'audio');

        if (hasAudio) {
          // LEGACY FLOW for Audio
          for (const attachment of attachments || []) {
            if (attachment.type === 'audio') {
              const uploadResult = await uploadAttachment(
                attachment,
                text,
                conversation.id
              );

              // Update message with upload result
              const audioSid = uploadResult.content?.audio_io;

              if (!audioSid) {
                throw new Error('Audio upload failed - missing audio_io');
              }

              // Mark as sent
              updateMessage(tempMessage.id, {
                ...tempMessage,
                uploadStatus: 'sent',
                isUploading: false,
                isFailed: false,
                isTemporary: false,
                realMessageId: uploadResult.id.toString(),
                isLoading: false,
              });

              response = { id: uploadResult.id };

              // Send to Sara
              if (assistant === 'mediaid' || assistant === 'medidoc') {
                await sendToSaraAI(
                  uploadResult.id,
                  text || 'Voice message',
                  senderId,
                  audioSid,
                  undefined
                );
              }
            }
          }
          // End of Audio Flow
          return;
        }

        // NEW FLOW for Non-Audio (Images, Docs)
        let legacyMediaFields = {};

        if (attachments?.length) {
          // Upload all attachments to Vault in parallel
          const uploadPromises = attachments.map(att => uploadToVault(att));
          const uploadResults = await Promise.all(uploadPromises);

          // Share all uploaded documents with the conversation
          const sharePromises = uploadResults.map(res => {
            if (res.doc_external_id) {
              return shareVaultDocument(res.doc_external_id, conversation.id);
            }
            return Promise.resolve();
          });

          await Promise.all(sharePromises);

          finalAttachments = uploadResults.map(res => ({
            blob_path: res.blob_path,
            content_type: res.mimeType,
            filename: res.filename
          }));

          // Populate legacy fields for single/primary attachment compatibility
          if (uploadResults.length > 0) {
            const primary = uploadResults[0];
            legacyMediaFields = {
              file_io: primary.blob_url,
              blob_url: primary.blob_url,
              blob_path: primary.blob_path,
              media_filename: primary.filename,
              media_content_type: primary.mimeType,
              has_media: true,
              storage_status: 'completed',
            };
          }
        }

        response = await sendTextMutation.mutateAsync({
          chatId: conversation.id,
          text,
          senderId,
          userId,
          patientId: conversation.patient_id || undefined,
          receiverId,
          assistant,
          attachments: finalAttachments,
          location: { latitude: -90, longitude: -180 },
          ...legacyMediaFields,
        });

        // Mark as sent
        updateMessage(tempMessage.id, {
          ...tempMessage,
          uploadStatus: 'sent',
          isUploading: false,
          isFailed: false,
          isTemporary: false,
          displayTimestamp: undefined,
          timestamp: new Date().toISOString(),
          realMessageId: response.id.toString(), // Update with real ID
        });

        // Send to Sara for all mediaid/medidoc conversations
        if (
          (assistant === 'mediaid' || assistant === 'medidoc') &&
          response?.id
        ) {
          await sendToSaraAI(
            response.id,
            text || (finalAttachments ? 'Media message' : ''),
            senderId,
            undefined,
            undefined,
            finalAttachments
          );
        } else {
          console.log('[SEND_MESSAGE] ⏭️ Skipping sendToSaraAI', {
            assistant,
            hasResponse: !!response,
            hasResponseId: !!response?.id,
          });
        }
      } catch (error) {
        logger.error('Send message failed', error as Error);

        // Mark as failed
        updateMessage(tempMessage.id, {
          ...tempMessage,
          uploadStatus: 'failed',
          isUploading: false,
          isFailed: true,
          displayTimestamp: 'Failed to send',
          error:
            error instanceof Error ? error.message : 'Failed to send message',
        });

        onError(
          'Send Error',
          error instanceof Error ? error.message : 'Failed to send message'
        );
      }
    },
    [
      authState.user,
      conversation,
      receiverId,
      assistant,
      addTemporaryMessage,
      updateMessage,
      onError,
      uploadAttachment,
      sendToSaraAI,
      sendTextMutation,
      authState.patientProfile,
      authState.doctorProfile,
      uploadToVault,
      shareVaultDocument
    ]
  );

  return {
    sendTextMessage,
    receiverId,
    isLoading: sendTextMutation.isPending || sendTextToSaraMutation.isPending,
  };
};
