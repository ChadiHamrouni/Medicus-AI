import {
  ConversationsApiResponse,
  ConversationsResponse,
  FetchConversationsParams,
} from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusConvoApiBaseUrl;

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

    const fullUrl = `${MEDICUS_BASE_URL}/conversations/?${params.toString()}`;
    console.log('DEBUG: Fetching conversations from:', fullUrl);
    const response = await authenticatedFetch(fullUrl);

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
    console.error('FULL ERROR:', error);
    logger.error('Error in fetchConversations', error as Error, {
      component: 'medicusConvo',
      function: 'fetchConversations',
    });
    throw error;
  }
};
