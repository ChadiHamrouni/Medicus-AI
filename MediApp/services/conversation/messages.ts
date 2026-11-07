import { ApiMessage, MessagesResponse, SendMessageRequest } from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusConvoApiBaseUrl;

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
