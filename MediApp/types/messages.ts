export interface AttachmentObject {
  blob_path: string;
  content_type: string;
  filename: string;
  size?: number;
}

export interface AppPayload {
  text_io?: string;
  audio_io?: string;
  attachments?: (string | AttachmentObject)[]; // Support both legacy strings and new objects
  type: 'app';
  user_id: number;
  sender_id: number;
  assistant: string;
  convo_id: string;
  convo_status: string;
  receiver_id?: number;
  direct_message: boolean;
  location?: Location;
}

export interface CloudPayload {
  text_io?: string;
  audio_io?: string;
  type: 'cloud';
  cloud_session_id?: string;
  region?: string;
  api_version?: string;
  status_code: number;
  message: string;
  media_sids?: string[]; // Array of media SIDs for multiple attachments
}

export type MessageContent = AppPayload | CloudPayload;

export interface ApiMessage {
  id: number;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: MessageContent;
  created_at: string;
  processed_by_ai: boolean;
}

export interface MessagesResponse {
  results: ApiMessage[];
  next: number | null;
  previous: number | null;
  count: number;
}

/**
 * Interface for sending a message
 */
export interface SendMessagePayload {
  text_io?: string;
  audio_io?: string;
  attachments?: (string | AttachmentObject)[]; // Support both legacy strings and new objects
  user_id: number;
  sender_id: number;
  patient_id?: number;
  doctor_id?: number | null; // Doctor context for AI
  assistant: string;
  convo_id: string;
  convo_status: string;
  receiver_id?: number; // Made optional since it can be null/0
  direct_message: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface SendMessageRequest {
  payload: SendMessagePayload;
}

export interface Attachment {
  uri: string;
  localUri?: string;
  remoteUri?: string;
  type: string; // "image" | "file" | "audio" | "audio/m4a" or other types
  name?: string;
  size?: number;
  mimeType?: string;
  duration?: number; // For audio attachments
  waveform?: number[]; // For audio visualization
}

export interface IMessage {
  id: string;
  senderId: string; // For deduplication (user_id)
  patientId?: string; // For display (patient context)
  text: string;
  timestamp: string;
  displayTimestamp?: string;
  attachments?: Attachment[];
  isUploading?: boolean;
  uploadStatus?: string;
  realMessageId?: string;
  isTemporary?: boolean;
  isFailed?: boolean;
  createdAt?: string;
  isLoading?: boolean;
}
