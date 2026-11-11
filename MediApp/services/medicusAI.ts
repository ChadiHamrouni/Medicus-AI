import { env, authenticatedFetch, logger } from '@/utils';

const MEDICUS_AI_BASE_URL = env.medicusAIApiBaseUrl;

export interface Location {
  latitude: number;
  longitude: number;
}

export interface AppPayload {
  text_io?: string;
  audio_io?: string;
  file_io?: string;
  attachments?: any[]; // Attachment metadata for images/files
  type: 'app';
  user_id: number;
  sender_id: number;
  assistant: string;
  convo_id: string;
  convo_status: 'NEW' | 'ACTIVE' | 'INACTIVE';
  receiver_id?: number;
  direct_message: boolean;
  location?: Location;
  // Backend correlation / idempotency
  message_id?: number;
  // Patient/Doctor IDs for AI context loading
  patient_id?: number | null;
  doctor_id?: number | null;
  // Mirror conversation field for tool cross-referencing
  mirror_convo_id?: string | null;
  // Compaction (AI long-term memory) — sent by frontend for ACTIVE conversations
  compact_summary?: string | null;
  compact_to_message?: number | null;
  // Rolling context window — last N [user, assistant] pairs since last compaction
  recent_messages?: Array<{ role: 'user' | 'assistant'; content: string }> | null;
}

/**
 * Derive conversation status for the AI backend.
 *
 * - NEW      : no messages ever sent
 * - INACTIVE : last activity > 24 hours ago (backend will load context from DB)
 * - ACTIVE   : recent conversation (backend uses compact_summary from payload)
 *
 * Future: when SQLite cache is in place, this drives cache-miss hydration.
 */
export function getConvoStatus(conversation: {
  lastMessage?: string | null;
  lastMessageTimestamp?: string | null;
  updated_at: string;
}): 'NEW' | 'ACTIVE' | 'INACTIVE' {
  if (!conversation.lastMessage && !conversation.lastMessageTimestamp) return 'NEW';
  const lastTs = conversation.lastMessageTimestamp || conversation.updated_at;
  const hoursSince = (Date.now() - new Date(lastTs).getTime()) / 3_600_000;
  return hoursSince > 24 ? 'INACTIVE' : 'ACTIVE';
}

export interface MedicusAIRequest {
  payload: AppPayload;
}

export interface MedicusAIResponse {
  status_code: number;
  message?: string;
  text_io?: string; // Sara's response text — echoed from CloudPayload for rolling window
  transcript?: string; // voice turns: what the user said, for the rolling window
}

/**
 * Send an audio file to Sara AI via MedicusAI service
 */
export const sendAudioToSara = async (
  request: MedicusAIRequest
): Promise<MedicusAIResponse> => {
  return postSara('audio', request.payload);
};

/**
 * Send a text message to Sara AI via MedicusAI service
 */
export const sendTextToSara = async (
  request: MedicusAIRequest
): Promise<MedicusAIResponse> => {
  return postSara('text', request.payload);
};

/**
 * Send a file to Sara AI via MedicusAI service
 */
export const sendFileToSara = async (
  request: MedicusAIRequest
): Promise<MedicusAIResponse> => {
  return postSara('file', request.payload);
};

// Internal: normalize base URL once
const NORMALIZED_BASE = MEDICUS_AI_BASE_URL
  ? MEDICUS_AI_BASE_URL.replace(/\/+$/, '')
  : '';

// Shared POST helper with timeout, improved error parsing, and logging
async function postSara(
  op: 'text' | 'audio' | 'file',
  payload: AppPayload
): Promise<MedicusAIResponse> {
  if (!NORMALIZED_BASE) {
    throw new Error('MedicusAI base URL not configured');
  }
  if (!payload.convo_id) {
    throw new Error('Missing convo_id in Sara payload');
  }
  if (op === 'text' && !payload.text_io && (!payload.attachments || payload.attachments.length === 0)) {
    throw new Error('Missing text_io or attachments for text operation');
  }
  if (op === 'audio' && !payload.audio_io) {
    throw new Error('Missing audio_io for audio operation');
  }
  if (op === 'file' && (!payload.attachments || payload.attachments.length === 0)) {
    throw new Error('Missing attachments for file operation');
  }

  const correlationId = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  logger.info('Sara AI request start', {
    component: 'medicusAI',
    op,
    correlationId,
    convo_id: payload.convo_id,
    assistant: payload.assistant,
    textLen: payload.text_io?.length,
    hasAudio: !!payload.audio_io,
    hasAttachments: !!payload.attachments && payload.attachments.length > 0,
    attachmentsCount: payload.attachments?.length || 0,
    message_id: payload.message_id,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000); // 300s: agent turns on local models can take minutes

  let resp: Response;
  let rawBody: string | undefined;

  try {
    resp = await authenticatedFetch(`${NORMALIZED_BASE}/chat`, {
      method: 'POST',
      headers: {
        'X-Correlation-Id': correlationId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (netErr) {
    clearTimeout(timeout);
    logger.error('Sara AI network/abort error', netErr as Error, {
      component: 'medicusAI',
      op,
      correlationId,
      convo_id: payload.convo_id,
    });
    throw netErr;
  } finally {
    clearTimeout(timeout);
  }

  try {
    rawBody = await resp.text();
  } catch (readErr) {
    rawBody = `<failed to read body: ${(readErr as Error).message}>`;
  }

  const bodySnippet = rawBody
    ? rawBody.slice(0, 400) + (rawBody.length > 400 ? '...' : '')
    : '';

  if (!resp.ok) {
    let parsed: any = null;
    try {
      parsed = rawBody && JSON.parse(rawBody);
    } catch {
      /* ignore */
    }
    const statusLine = `${resp.status} ${resp.statusText}`;
    const errorMessage =
      parsed?.message ||
      parsed?.detail ||
      `Sara AI ${op} request failed: ${statusLine}`;
    logger.error('Sara AI request failed', new Error(errorMessage), {
      component: 'medicusAI',
      op,
      correlationId,
      status: resp.status,
      statusText: resp.statusText,
      bodySnippet,
      parsedErrorKeys: parsed ? Object.keys(parsed) : null,
      convo_id: payload.convo_id,
    });
    if (resp.status === 401) {
      throw new Error('Authentication failed. Token expired or invalid.');
    }
    throw new Error(errorMessage);
  }

  let data: MedicusAIResponse;
  try {
    data = rawBody
      ? (JSON.parse(rawBody) as MedicusAIResponse)
      : { status_code: 500, message: 'Empty response body' };
  } catch (parseErr) {
    logger.error('Sara AI JSON parse error', parseErr as Error, {
      component: 'medicusAI',
      op,
      correlationId,
      bodySnippet,
    });
    throw new Error(
      `Failed to parse Sara AI response: ${(parseErr as Error).message}`
    );
  }

  logger.info('Sara AI request success', {
    component: 'medicusAI',
    op,
    correlationId,
    status_code: data.status_code,
    message_present: !!data.message,
    convo_id: payload.convo_id,
  });

  return data;
}
