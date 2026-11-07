import {
  ConversationsApiResponse,
  ConversationsResponse,
} from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const MEDICUS_BASE_URL = env.medicusConvoApiBaseUrl;

export interface SearchConversationsParams {
  q: string;
  mode?: 'participant' | 'content';
  assistant?: 'mediaid' | 'medidoc';
  patientContextId?: number | null;
  doctorContextId?: number | null;
  page?: number;
  pageSize?: number;
}

export const searchConversations = async ({
  q,
  mode = 'participant',
  assistant = 'mediaid',
  patientContextId,
  doctorContextId,
  page = 1,
  pageSize = 20,
}: SearchConversationsParams): Promise<ConversationsResponse> => {
  try {
    const params = new URLSearchParams({
      q,
      mode,
      assistant,
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (patientContextId !== undefined && patientContextId !== null) {
      params.append('patient_id', patientContextId.toString());
    }
    if (doctorContextId !== undefined && doctorContextId !== null) {
      params.append('doctor_id', doctorContextId.toString());
    }

    const fullUrl = `${MEDICUS_BASE_URL}/conversations/search?${params.toString()}`;
    const response = await authenticatedFetch(fullUrl);

    if (!response.ok) {
      const responseText = await response.text();

      if (response.status === 401) {
        throw new Error('Authentication failed. Token expired or invalid.');
      }

      throw new Error(
        `Failed to search conversations: ${response.status} ${response.statusText}. ${responseText}`
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
    logger.error('Error in searchConversations', error as Error, {
      component: 'medicusConvo',
      function: 'searchConversations',
    });
    throw error;
  }
};