import { ConversationSummary } from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusConvoApiBaseUrl;

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
