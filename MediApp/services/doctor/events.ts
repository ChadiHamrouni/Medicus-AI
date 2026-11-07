import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

export interface DoctorEvent {
  id: number;
  doctor_id: number;
  patient_id: number;
  patient_name: string;
  event_date: string;
  event_time?: string | null;
  event_location?: string | null;
  event_type: 'visit' | 'procedure';
  event_name?: string | null;
  event_details?: Record<string, any> | null;
  event_summary?: string | null;
  healthcare_provider_name?: string | null;
  status: 'active' | 'past';
}

export interface DoctorEventsResponse {
  events: DoctorEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetDoctorEventsParams {
  doctorId: number;
  limit?: number;
  offset?: number;
  status?: 'active' | 'past';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  patientId?: number;
}

/**
 * Get doctor's calendar events (visits and procedures)
 */
export const getDoctorEvents = async ({
  doctorId,
  limit = 100,
  offset = 0,
  status,
  dateFrom,
  dateTo,
  patientId,
}: GetDoctorEventsParams): Promise<DoctorEventsResponse> => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    if (dateFrom) {
      params.append('date_from', dateFrom);
    }

    if (dateTo) {
      params.append('date_to', dateTo);
    }

    if (patientId) {
      params.append('patient_id', patientId.toString());
    }

    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/${doctorId}/events?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch doctor events: ${response.status}`);
    }

    const result: DoctorEventsResponse = await response.json();

    logger.info('Doctor events fetched successfully', {
      component: 'DoctorEventsService',
      doctorId,
      total: result.total,
      count: result.events.length,
      status,
      dateFrom,
      dateTo,
    });

    return result;
  } catch (error) {
    logger.error('Failed to fetch doctor events', error as Error, {
      component: 'DoctorEventsService',
      doctorId,
    });
    throw error;
  }
};
