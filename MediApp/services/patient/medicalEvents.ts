import { medicusUserApi } from '@/utils/infrastructure/typedApiClient';

// TypeScript interface matching MedicalEventEntry Pydantic model
export interface MedicalEventEntry {
  event_id: number;
  patient_id: number;
  doctor_id: number;
  doctor_name: string;
  event_date: string; // ISO format date
  event_time: string | null; // HH:MM format
  event_location: string | null;
  event_type: 'visit' | 'exam' | 'exam_order' | 'procedure';
  event_name: string;
  event_details: Record<string, any> | null;
  event_summary: string | null;
  healthcare_provider_name: string | null;
  status: 'active' | 'past';
}

// TypeScript interface matching MedicalEventsResponse Pydantic model
export interface MedicalEventsResponse {
  patient_id: number;
  events: MedicalEventEntry[];
  total: number;
  limit: number;
  offset: number;
}

export const getMedicalEvents = async (
  patientId: number,
  limit: number = 100,
  offset: number = 0
): Promise<MedicalEventsResponse> => {
  return medicusUserApi.get<MedicalEventsResponse>(
    `medical-events/patients/${patientId}`,
    { limit, offset }
  );
};
