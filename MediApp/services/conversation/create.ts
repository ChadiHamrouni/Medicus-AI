import { Conversation, CreateConversationRequest } from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusConvoApiBaseUrl;

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
