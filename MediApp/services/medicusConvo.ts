import { env, logger, authenticatedFetch } from '@/utils';
import type { ConversationContext } from '@/types';

const MEDICUS_BASE_URL = env.medicusConvoApiBaseUrl;

export interface User {
  name: string;
  image: string;
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
  patient?: User | null;
  doctor?: User | null;
  conversation_type?: 'patient_ai' | 'doctor_ai' | 'doctor_patient' | 'unknown';
  has_unsummarized_messages?: boolean;

  // Mirror conversation field for doctor-patient linked conversations
  mirror_conversation_id?: string | null;
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
 * Fetches conversations from the medicus convo API with context filtering support
 */
export const fetchConversations = async ({
  page = 1,
  pageSize = 20,
  patientContextId,
  doctorContextId,
  assistant = 'mediaid',
}: FetchConversationsParams = {}): Promise<ConversationsResponse> => {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      assistant: assistant,
    });

    // Add context filtering parameters if provided
    if (patientContextId !== undefined && patientContextId !== null) {
      params.append('patient_id', patientContextId.toString());
    }
    if (doctorContextId !== undefined && doctorContextId !== null) {
      params.append('doctor_id', doctorContextId.toString());
    }

    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/conversations/?${params.toString()}`
    );

    if (!response.ok) {
      const responseText = await response.text();

      // Handle authentication errors
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }

      throw new Error(
        `Failed to fetch conversations: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data: ConversationsApiResponse = await response.json();

    return {
      results: data.conversations || [],
      count: data.total || 0,
      next: data.next || null,
      previous: data.previous || null,
    };
  } catch (error) {
    logger.error('Error in fetchConversations', error as Error, {
      component: 'medicusConvo',
      function: 'fetchConversations',
    });
    throw error;
  }
};

/**
 * Fetches a single conversation by ID
 */
export const fetchConversationById = async (
  convoId: string
): Promise<Conversation> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/conversations/${convoId}/`
    );

    if (!response.ok) {
      const responseText = await response.text();

      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }

      throw new Error(
        `Failed to fetch conversation: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data: Conversation = await response.json();
    return data;
  } catch (error) {
    logger.error('Error in fetchConversationById', error as Error, {
      component: 'medicusConvo',
      function: 'fetchConversationById',
      context: { convoId },
    });
    throw error;
  }
};

/**
 * Fetch AI context state for a conversation.
 * Returns compaction (AI long-term memory) + domain summaries.
 *
 * Called on conversation open to hydrate local state.
 * Future: result is cached in device-side SQLite.
 */
export const fetchConversationContext = async (
  convoId: string
): Promise<ConversationContext> => {
  try {
    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/conversations/${convoId}/context`
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }
      const text = await response.text();
      throw new Error(
        `Failed to fetch conversation context: ${response.status} ${response.statusText}. ${text}`
      );
    }

    return response.json() as Promise<ConversationContext>;
  } catch (error) {
    logger.error('Error in fetchConversationContext', error as Error, {
      component: 'medicusConvo',
      function: 'fetchConversationContext',
      context: { convoId },
    });
    throw error;
  }
};

export interface Location {
  latitude: string;
  longitude: string;
}

export interface AppPayload {
  text_io?: string;
  audio_io?: string;
  file_io?: string;
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
  file_io?: string;
  type: 'cloud';
  cloud_session_id: string;
  region: string;
  api_version: string;
  status_code: number;
  message: string;
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
 * Fetches messages from a conversation
 */
export const fetchConversationMessages = async (
  convoId: string,
  since?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<MessagesResponse> => {
  try {
    if (!MEDICUS_BASE_URL) {
      throw new Error('Base URL not configured');
    }

    // Ensure page and pageSize are valid numbers
    const validPage = typeof page === 'number' && !isNaN(page) ? page : 1;
    const validPageSize =
      typeof pageSize === 'number' && !isNaN(pageSize) ? pageSize : 50;

    // Build query parameters
    const params = new URLSearchParams({
      page: validPage.toString(),
      page_size: validPageSize.toString(),
    });

    if (since) {
      params.append('since', since);
    }

    logger.info('Check this message:', {
      url: `${MEDICUS_BASE_URL}/conversations/${convoId}/messages?${params.toString()}`,
    });

    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/conversations/${convoId}/messages?${params.toString()}`
    );

    if (!response.ok) {
      const responseText = await response.text();

      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }

      throw new Error(
        `Failed to fetch messages: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data: MessagesResponse = await response.json();

    return {
      results: data.results || [],
      next: data.next || null,
      previous: data.previous || null,
      count: data.count || 0,
    };
  } catch (error) {
    logger.error('Error in fetchConversationMessages', error as Error, {
      component: 'medicusConvo',
      function: 'fetchConversationMessages',
      context: { convoId, since, page, pageSize },
    });
    throw error;
  }
};

// Search conversations function removed - search is now handled by Sara AI
// Doctors can ask Sara: "Find that patient with the cough" or "Show me John Doe's conversation"
// Sara will call the search_conversations tool and return results with clickable deep links

/**
 * Interface for creating a new conversation
 */
export interface CreateConversationRequest {
  assistant: string;
  doctor_id: number;
  patient_id: number;
}

/**
 * Creates a new conversation between a doctor and patient
 */
export const createConversation = async (
  request: CreateConversationRequest
): Promise<Conversation> => {
  try {
    if (!MEDICUS_BASE_URL) {
      throw new Error('Base URL not configured');
    }

    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/conversations/`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();

      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }

      // Handle 409 conflict (conversation already exists)
      if (response.status === 409) {
        throw new Error('CONVERSATION_EXISTS');
      }

      throw new Error(
        `Failed to create conversation: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data: Conversation = await response.json();
    return data;
  } catch (error) {
    logger.error('Error in createConversation', error as Error, {
      component: 'medicusConvo',
      function: 'createConversation',
      context: { request },
    });
    throw error;
  }
};

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

/**
 * Interface for sending a message
 */
export interface SendMessagePayload {
  text_io?: string;
  audio_io?: string;
  file_io?: string;
  user_id: number;
  sender_id: number;
  assistant: string;
  convo_id: string;
  convo_status: string;
  receiver_id: number;
  direct_message: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface SendMessageRequest {
  payload: SendMessagePayload;
}

/**
 * Sends a message to a conversation
 */
export const sendMessage = async (
  convoId: string,
  request: SendMessageRequest
): Promise<ApiMessage> => {
  try {
    if (!MEDICUS_BASE_URL) {
      throw new Error('Base URL not configured');
    }

    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/conversations/${convoId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();

      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }

      throw new Error(
        `Failed to send message: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data: ApiMessage = await response.json();
    return data;
  } catch (error) {
    logger.error('Error in sendMessage', error as Error, {
      component: 'medicusConvo',
      function: 'sendMessage',
      context: { convoId, request },
    });
    throw error;
  }
};

/**
 * Fetches AI-generated summary for a conversation
 */
export const fetchConversationSummary = async (
  convoId: string
): Promise<ConversationSummary> => {
  try {
    if (!MEDICUS_BASE_URL) {
      throw new Error('Base URL not configured');
    }

    const response = await authenticatedFetch(
      `${MEDICUS_BASE_URL}/conversations/${convoId}/summary`
    );

    if (!response.ok) {
      const responseText = await response.text();

      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }

      throw new Error(
        `Failed to fetch conversation summary: ${response.status} ${response.statusText}. ${responseText}`
      );
    }

    const data: ConversationSummary = await response.json();

    return data;
  } catch (error) {
    logger.error('Error in fetchConversationSummary', error as Error, {
      component: 'medicusConvo',
      function: 'fetchConversationSummary',
      context: { convoId },
    });
    throw error;
  }
};
