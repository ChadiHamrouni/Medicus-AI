import { authenticatedFetch, env } from '@/utils';
import { logger } from '@/utils';

export interface ConvoMessageContent {
  text_io?: string;
  text?: string;
  has_media?: boolean;
  [k: string]: any;
}

export interface ConvoMessage {
  id: string;
  role: string;
  content: ConvoMessageContent;
  created_at: string;
  updated_at?: string;
  sender_id?: number;
  [k: string]: any;
}

export interface MessagesPage {
  results: ConvoMessage[];
  count: number;
  limit: number;
  offset: number;
}

const BASE = env.medicusConvoApiBaseUrl; // from EXPO_PUBLIC_MEDICUS_API_BASE_URL (utils/infrastructure/env.ts)

/**
 * Fetch a page of messages for a conversation.
 * Backend endpoint shape (based on test script):
 * GET /api/MedicusConvo/{convoId}/messages?limit=50&offset=0
 */
export async function fetchConversationMessages(
  convoId: string,
  limit: number,
  offset: number
): Promise<MessagesPage> {
  if (!BASE) {
    throw new Error(
      'MedicusConvo base URL not configured (env.medicusConvoApiBaseUrl)'
    );
  }

  const url = `${BASE}/conversations/${convoId}/messages?limit=${limit}&offset=${offset}`;
  logger.info('Fetching conversation messages', {
    component: 'medicusConvoMessages',
    convoId,
    limit,
    offset,
  });

  const resp = await authenticatedFetch(url);

  if (!resp.ok) {
    const text = await resp.text();
    logger.error('Failed to fetch conversation messages', new Error(text), {
      component: 'medicusConvoMessages',
      status: resp.status,
    });
    throw new Error(
      `Failed to load messages: ${resp.status} ${resp.statusText}`
    );
  }

  const data = (await resp.json()) as Partial<MessagesPage>;
  return {
    results: data.results || [],
    count: data.count || 0,
    limit,
    offset,
  };
}
