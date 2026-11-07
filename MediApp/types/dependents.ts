// Dependent-related interfaces
export interface DependentEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  email?: string;
  is_primary: boolean;
}

export interface CreateDependentRequest {
  first_name: string;
  last_name: string;
  relationship: string;
  dob: string; // Format: YYYY-MM-DD
  gender?: string;
  emergency_contact?: DependentEmergencyContact[];
  address?: Record<string, string>;
  contact?: Record<string, string>;
  wa_number?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDependentRequest {
  first_name?: string;
  last_name?: string;
  relationship?: string;
  dob?: string;
  gender?: string;
  emergency_contact?: DependentEmergencyContact[];
  address?: Record<string, string>;
  contact?: Record<string, string>;
  wa_number?: string;
  metadata?: Record<string, any>;
  status?: string;
}

export interface DependentResponse {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  relationship: string;
  dob: string;
  age: number;
  gender?: string;
  wa_number?: string;
  emergency_contact: DependentEmergencyContact[];
  status: string;
  profile_picture_url?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  country_id?: number;
  country_name?: string;
  medical_data?: {
    medical_conditions?: string[];
    allergies?: string;
    blood_type?: string;
    other_conditions?: string;
    family_history?: string;
    [key: string]: any;
  };
}

export interface DependentListResponse {
  dependents: DependentResponse[];
  total: number;
  main_patient?: DependentResponse;
  summary: {
    total_dependents: number;
    relationship_breakdown: Record<string, number>;
    age_groups: {
      minor: number;
      adult: number;
    };
    has_minors: boolean;
    has_adults: boolean;
  };
}

export interface SwitchContextRequest {
  patient_id: number;
}

export interface SwitchContextResponse {
  active_patient_id: number;
  active_patient: DependentResponse;
  is_dependent_context: boolean;
  available_patients: DependentResponse[];
}
