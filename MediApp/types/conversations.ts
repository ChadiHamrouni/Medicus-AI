/**
 * Patient info from conversation view.
 * Includes age and gender from dialog.conversations_view.
 */
interface PatientInfo {
  name: string;
  image?: string;
  age?: number | null;
  gender?: string | null;
}

/**
 * Doctor info from conversation view.
 * Includes specialty from dialog.conversations_view.
 */
interface DoctorInfo {
  name: string;
  image?: string;
  specialty_name?: string | null;
}

export interface Conversation {
  id: string;
  user_id: number;
  patient_id?: number | null;
  doctor_id?: number | null;
  assistant: string;
  region_id?: number | null;
  created_at: string;
  updated_at: string;
  state: string;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  patient?: PatientInfo | null;
  doctor?: DoctorInfo | null;
  conversation_type?: 'patient_ai' | 'doctor_ai' | 'doctor_patient' | 'unknown';
  has_unsummarized_messages?: boolean;

  // Mirror conversation field for doctor-patient linked conversations
  mirror_conversation_id?: string | null;
}

/**
 * AI context state for a conversation.
 * Returned by GET /conversations/{id}/context.
 * Future: hydration payload for device-side SQLite cache.
 */
export interface ConversationContext {
  conversation_id: string;
  compact_summary: string | null;
  compact_to_message: number | null;
  medibrief_summary: string | null;
  mediexplain_summary: string | null;
}

export interface ConversationsResponse {
  results: Conversation[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ConversationsApiResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
}

/**
 * Interface for fetching conversations with optional context filtering
 */
export interface FetchConversationsParams {
  page?: number;
  pageSize?: number;
  patientContextId?: number | null;
  doctorContextId?: number | null;
  assistant?: 'mediaid' | 'medidoc';
}

/**
 * Interface for creating a new conversation
 */
export interface CreateConversationRequest {
  assistant: string;
  doctor_id: number;
  patient_id: number;
}

/**
 * Interface for conversation summary response
 */
export interface ConversationSummary {
  conversation_id: string;
  summary_text: string;
  key_symptoms: string[];
  urgency_level: string;
  message_count: number;
  generated_at: string;
}
