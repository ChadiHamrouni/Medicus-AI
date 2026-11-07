/**
 * Patient profile types for patients_view materialized view
 */

export interface PatientProfileResponse {
  // Basic info from patients_view
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  display_name?: string;
  email: string;
  phone_number?: string;
  whatsapp_number?: string;
  date_of_birth?: string;

  // Personal info
  gender?: string;
  dob?: string;
  age?: number;

  // Location info
  country_id?: number;
  country_name?: string; // This is the key field we need from patients_view
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;

  // Medical info
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  medical_data?: {
    medical_conditions?: string[];
    allergies?: string;
    blood_type?: string;
    other_conditions?: string;
    family_history?: string;
    [key: string]: any;
  };
  emergency_contact?: {
    // New format: primary/secondary structure
    primary?: {
      name: string;
      phone: string;
      relationship: string;
      email?: string;
    };
    secondary?: {
      name: string;
      phone: string;
      relationship?: string;
      email?: string;
    };
    // Legacy format: direct fields (for backward compatibility)
    name?: string;
    phone?: string;
    relationship?: string;
    email?: string;
    is_primary?: boolean;
  };

  // Insurance info
  insurance_provider?: string;
  insurance_member_id?: string;
  insurance_group_number?: string;

  // Status
  is_active: boolean;
  is_verified: boolean;
  account_status: string;
  signup_step: number;

  // Preferences
  preferred_language?: string;
  communication_preferences?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push_notifications: boolean;
  };

  // Dependents
  dependents?: {
    id: number;
    first_name: string;
    last_name: string;
    relationship: string;
    age: number;
    dob: string;
    gender?: string;
  }[];

  // Health Calendar (loaded at login from medical_events_view)
  medical_events?: {
    id: number;
    patient_id: number;
    doctor_id?: number;
    doctor_name?: string;
    exam_type: string;
    exam_name: string;
    scheduled_date: string;
    scheduled_time?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    instructions?: string;
    healthcare_provider_name?: string;
    event_details?: any;
    status: 'scheduled' | 'completed' | 'cancelled';
    type: 'visit' | 'exam' | 'exam_order' | 'procedure';
    created_at?: string;
  }[];

  // Health Profile (loaded at login from medical_vitals_view)
  medical_vitals?: {
    id: number;
    patient_id: number;
    doctor_id?: number;
    doctor_name?: string;
    healthcare_provider_id?: number;
    healthcare_provider_name?: string;
    recorded_at: string;
    medical_data?: {
      vitals?: {
        temperature_c?: number;
        blood_pressure?: { systolic: number; diastolic: number };
        oxygen_saturation?: number;
        resting_heart_rate?: number;
      };
      body_metrics?: {
        bmi?: number;
        waist_cm?: number;
        height_cm?: number;
        weight_kg?: number;
      };
      lifestyle?: {
        diet?: string;
        alcohol_use?: string;
        sleep_hours?: number;
        exercise_level?: string;
        smoking_status?: string;
      };
      immunizations?: {
        vaccine: string;
        date: string;
        notes?: string;
      }[];
      biological_traits?: {
        blood_type?: string;
        rh_factor?: string;
        genetic_traits?: string[];
      };
      reproductive_health?: {
        sex?: 'male' | 'female' | 'other';
        menstrual_cycle?: any;
        pregnancy_history?: any;
      };
    };
    notes?: string;
    created_at: string;
    updated_at: string;
  }[];

  // Legacy fields (deprecated - kept for backward compatibility)
  upcoming_medical_events?: {
    id: number;
    patient_id: number;
    doctor_id?: number;
    exam_type: string;
    exam_name: string;
    scheduled_date: string;
    scheduled_time?: string;
    location?: string;
    instructions?: string;
    status: string;
    created_at: string;
  }[];
  past_medical_events?: {
    id: number;
    patient_id: number;
    doctor_id?: number;
    exam_type: string;
    exam_name: string;
    scheduled_date: string;
    scheduled_time?: string;
    location?: string;
    instructions?: string;
    status: string;
    created_at: string;
  }[];

  // Metadata
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

/**
 * Medical History types for medical history API
 */

export type MedicalRecordType =
  | 'visit'
  | 'test'
  | 'procedure'
  | 'imaging'
  | 'diagnosis'
  | 'hospitalization'
  | 'prescription';

export type MedicalRecordStatus = 'completed' | 'pending' | 'scheduled';

export interface MedicalHistoryRecord {
  id: string;
  type: MedicalRecordType;
  title: string;
  date: string; // ISO date string
  provider: string;
  location?: string;
  description: string;
  results?: string;
  follow_up?: string;
  attachments?: string[];
  status: MedicalRecordStatus;
  doctor_name?: string;
}

export interface MedicalHistorySummary {
  total_records: number;
  total_visits: number;
  total_exams: number;
  total_prescriptions: number;
  last_visit_date?: string;
  last_exam_date?: string;
}

export interface MedicalHistoryResponse {
  records: MedicalHistoryRecord[];
  summary: MedicalHistorySummary;
  patient_id: number;
}

export interface PatientAdditionalInfoData {
  insuranceProvider?: string;
  insuranceId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  chronicConditions?: string;
  medications?: string;
  allergies?: string;
  preferredLanguage?: string;
}

export interface MedicalData {
  chronic_conditions?: string[];
  allergies?: string;
  medications?: string[];
}

export interface EmergencyContact {
  primary_contact?: {
    name?: string;
    phone?: string;
    email?: string;
    relationship?: string;
    is_primary?: boolean;
    address?: Record<string, string>;
    notes?: string;
  };
  alternate_contact?: {
    name?: string;
    phone?: string;
    email?: string;
    relationship?: string;
    is_primary?: boolean;
    address?: Record<string, string>;
    notes?: string;
  };
}

export interface PatientMetadata {
  insurance_provider?: string;
  insurance_member_id?: string;
  preferred_language?: string;
}
