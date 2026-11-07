import { Attachment } from '@/types';

export interface MessageProps {
  sender: string;
  text: string;
  timestamp: string;
  isCurrentUser: boolean;
  avatar?: string;
  attachments?: Attachment[];
  isUploading?: boolean;
  uploadStatus?: string;
  onRetry?: (_messageId: string) => void;
  messageId?: string;
  conversationId?: string;
  isLoading?: boolean;
}

export interface AttachmentComponentProps {
  attachment: Attachment;
  maxWidth: number;
  isSending: boolean;
  messageId?: string;
  index: number;
}
