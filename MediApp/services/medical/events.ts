import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusConvoApiBaseUrl;

export interface MedicalVisit {
  id: number;
  doctor_id: number;
  patient_id: number;
  start_time: string;
  end_time: string;
  visit_type:
    | 'consultation'
    | 'procedure'
    | 'mediexam'
    | 'medirx'
    | 'follow-up'
    | 'check-up'
    | 'emergency'
    | 'other';
  visit_details: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  created_at: string;
  updated_at: string;
  doctor_name?: string;
  doctor_specialty?: string;
  location?: string;
}

export interface MedicalExam {
  id: number;
  patient_id: number;
  exam_type: string;
  exam_name: string;
  scheduled_date: string;
  scheduled_time?: string;
  location?: string;
  instructions?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  doctor_id?: number;
  doctor_name?: string;
}

export interface MedicalEvent {
  id: string;
  type: 'visit' | 'exam' | 'exam_order' | 'procedure';
  date: string;
  time: string;
  title: string;
  doctor_name?: string;
  specialty?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  healthcare_provider_name?: string;
  event_details?: any;
  status: string;
  details: string;
  visit_type?: string;
  exam_type?: string;
}

/**
 * Fetch upcoming and past medical visits for a patient
 */
export const getMedicalVisits = async (
  patientId: number,
  includeCompleted: boolean = false
): Promise<MedicalVisit[]> => {
  try {
    const params = new URLSearchParams({
      patient_id: patientId.toString(),
      include_completed: includeCompleted.toString(),
    });

    const response = await authenticatedFetch(
      `${API_BASE_URL}/medical-visits?${params}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch medical visits: ${response.status}`);
    }

    const visits: MedicalVisit[] = await response.json();

    logger.debug('Medical visits fetched successfully', {
      component: 'MedicalEventsService',
      patientId,
      count: visits.length,
    });

    return visits;
  } catch (error) {
    logger.error('Failed to fetch medical visits', error as Error, {
      component: 'MedicalEventsService',
      patientId,
    });
    throw error;
  }
};

/**
 * Fetch upcoming and past medical exams for a patient
 */
export const getMedicalExams = async (
  patientId: number,
  includeCompleted: boolean = false
): Promise<MedicalExam[]> => {
  try {
    const params = new URLSearchParams({
      patient_id: patientId.toString(),
      include_completed: includeCompleted.toString(),
    });

    const response = await authenticatedFetch(
      `${API_BASE_URL}/medical-exams?${params}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch medical exams: ${response.status}`);
    }

    const exams: MedicalExam[] = await response.json();

    logger.debug('Medical exams fetched successfully', {
      component: 'MedicalEventsService',
      patientId,
      count: exams.length,
    });

    return exams;
  } catch (error) {
    logger.error('Failed to fetch medical exams', error as Error, {
      component: 'MedicalEventsService',
      patientId,
    });
    throw error;
  }
};

/**
 * Transform visits and exams into a unified event list
 */
export const transformToEvents = (
  visits: MedicalVisit[],
  exams: MedicalExam[]
): MedicalEvent[] => {
  const visitEvents: MedicalEvent[] = visits.map(visit => ({
    id: `visit-${visit.id}`,
    type: 'visit' as const,
    date: visit.start_time.split('T')[0],
    time: new Date(visit.start_time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    title: getVisitTypeLabel(visit.visit_type),
    doctor_name: visit.doctor_name,
    specialty: visit.doctor_specialty,
    location: visit.location,
    status: mapVisitStatus(visit.status),
    details: visit.visit_details || 'No details provided',
    visit_type: visit.visit_type,
  }));

  const examEvents: MedicalEvent[] = exams.map(exam => ({
    id: `exam-${exam.id}`,
    type: 'exam' as const,
    date: exam.scheduled_date,
    time: exam.scheduled_time || 'TBD',
    title: exam.exam_name || exam.exam_type,
    doctor_name: exam.doctor_name,
    location: exam.location,
    status: mapExamStatus(exam.status),
    details: exam.instructions || 'No instructions provided',
    exam_type: exam.exam_type,
  }));

  // Combine and sort by date (soonest first)
  const allEvents = [...visitEvents, ...examEvents];
  allEvents.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return allEvents;
};

/**
 * Get human-readable visit type label
 */
const getVisitTypeLabel = (visitType: string): string => {
  const labels: Record<string, string> = {
    consultation: 'Medical Consultation',
    procedure: 'Medical Procedure',
    mediexam: 'Medical Examination',
    medirx: 'Prescription Consultation',
    'follow-up': 'Follow-up Visit',
    'check-up': 'Check-up',
    emergency: 'Emergency Visit',
    other: 'Medical Visit',
  };
  return labels[visitType] || 'Medical Visit';
};

/**
 * Map visit status to event status
 */
const mapVisitStatus = (
  status: string
): 'upcoming' | 'completed' | 'cancelled' => {
  if (status === 'scheduled') return 'upcoming';
  if (status === 'completed') return 'completed';
  return 'cancelled';
};

/**
 * Map exam status to event status
 */
const mapExamStatus = (
  status: string
): 'upcoming' | 'completed' | 'cancelled' => {
  if (status === 'scheduled') return 'upcoming';
  if (status === 'completed') return 'completed';
  return 'cancelled';
};
