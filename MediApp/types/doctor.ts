export interface DoctorAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DoctorProfileTimeSlot {
  start_time?: string;
  end_time?: string;
  other_locations_id?: number;
}

export interface DoctorWorkingHours {
  day_of_week?: string;
  is_available?: boolean;
  time_slots?: DoctorProfileTimeSlot[];
}

export interface Location {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country_id?: number;
  country_name?: string;
  is_primary: boolean;
  location_name: string;
  latitude?: number;
  longitude?: number;
}

export interface DoctorLocation {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country_id?: number;
  country_name?: string;
  is_primary: boolean;
  location_name: string;
  latitude?: number;
  longitude?: number;
}

export interface DoctorLocationsResponse {
  other_locations: DoctorLocation[];
  count: number;
}

export interface ContactInfo {
  professional_email?: string;
  professional_phone?: string;
  office_phone?: string;
  fax_number?: string;
  website_url?: string;
  email?: string;
  whatsapp_number?: string;
  phone?: string;
  practice_phone?: string;
  website?: string;
}

export interface MedicalProcedure {
  procedure_name: string;
  procedure_price: string;
}

export interface WorkingHoursRequest {
  working_hours: DoctorWorkingHours[];
}

export interface MedicalProceduresRequest {
  currency?: string;
  medical_procedures: MedicalProcedure[];
  consultation_types?: string[];
  insurance_accepted?: string[];
  gender?: string;
  language_id?: number;
  established_since?: string;
}

export interface MedicalProceduresResponse {
  currency?: string;
  medical_procedures?: MedicalProcedure[];
  consultation_types?: string[];
  insurance_accepted?: string[];
}

export interface Certification {
  title: string;
  certif_date: string;
  issuing_body: string;
}

export interface ProfessionalInfoRequest {
  other_specialties?: number[];
  practising_since?: number;
  medical_school?: string;
  graduation_year?: number;
  certifications?: Certification[];
  professional_affiliations?: string[];
  residency_program?: string;
  residency_year?: number;
  language_id?: number;
  languages_spoken?: number[];
}

export interface DoctorUpdateRequest {
  first_name?: string;
  last_name?: string;
  about_you?: string;
  gender?: string;
  dob?: string;
  contact_working_phone?: string;
  contact_cell_phone?: string;
  consultation_types?: string[];
  insurance_accepted?: string[];
  currency?: string;
  language_id?: number;
  established_since?: string;
  medical_procedures?: { procedure_name: string; procedure_price: number }[];
}

export interface AdditionalLink {
  website_name: string;
  website_url: string;
}

export interface AdditionalLinksRequest {
  additional_links: AdditionalLink[];
}

export interface DoctorProfileResponse {
  // Basic info
  id: number;
  user_id: number;
  whatsapp_number: string;
  email: string;
  full_name: string;
  display_name?: string; // Added to align with /profile endpoint returning display_name
  first_name?: string;
  last_name?: string;
  prefix?: string;
  name: string;
  rating?: number;
  review_count?: number;
  phone?: string;
  phone_number?: string;
  address?: string;

  // Professional info
  specialty?: string;
  sub_specialty?: string;
  other_specialties?: number[];
  license_state?: string;
  license_expiry?: string;
  board_certifications: string[];
  certifications?: Certification[];
  medical_school?: string;
  medical_school_metadata?: string;
  graduation_year?: number;
  graduation_year_metadata?: number;
  practising_since?: number;
  years_experience?: number;
  residency_program?: string;
  residency_year?: number;
  fellowship_program?: string;
  fellowship_year?: number;
  languages_spoken: string[];
  language_id?: number;
  country_id?: number;
  country_name?: string; // Added for doctors_view support
  medical_licence?: string; // Added for doctors_view support
  specialty_name?: string; // Added for doctors_view support
  languages_names?: string[]; // Added for doctors_view support
  other_specialties_names?: string[]; // Added for doctors_view support
  professional_affiliations?: string[];

  // Practice info
  practice_name?: string;
  practice_type?: string;
  practice_address?: DoctorAddress;
  practice_phone?: string;
  practice_email?: string;
  practice_website?: string;
  accepts_new_patients: boolean;
  telehealth_available: boolean;
  raw_address: {
    address_line_1: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };

  // Working hours
  working_hours: DoctorWorkingHours[];
  appointment_duration?: number;

  // Locations
  other_locations?: DoctorLocation[];

  // Medical procedures and fees
  medical_procedures?: MedicalProceduresResponse;
  consultation_types?: string[];
  insurance_accepted?: string[];
  currency?: string;
  established_since?: string;

  // Contact information
  contact_info?: ContactInfo;
  wa_number?: string;

  // Additional information
  about_you?: string;
  gender?: string;
  dob?: string;
  contact_working_phone?: string;
  contact_cell_phone?: string;
  profile_image?: string;

  // Additional links
  additional_links?: AdditionalLink[];

  // Status
  signup_step: number;
  is_verified: boolean;
  is_active: boolean;
  verification_documents_submitted: boolean;
  status?: string;

  // Additional properties from API responses
  super_category_id?: number;
  super_category_name?: string;
  language_name?: string;
  contact?: ContactInfo;
  clinic_address?: string;
  metadata?: {
    about_you?: string;
    additional_links?: AdditionalLink[];
  };
  in_network?: boolean;
  active_patient_convos?: number;
  total_patient_convos?: number;
  last_patient_convo?: string;
  data_source?: string;
  is_test_data?: boolean;
  missing_required_fields?: string[];
  is_profile_verified?: boolean;
  avatar_url?: string;
  profile_completion_percentage?: number;
  specialty_id?: number;
  fax_number?: string;
  bio?: string;

  // Metadata
  created_at: string;
  updated_at?: string;
}

export interface PracticeInfoData {
  prefix: string;
  first_name: string;
  last_name: string;
  // specialty_id: string;
  language_id: number;
  country_id: number;
  medical_licence: string;
  wa_number: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface Specialty {
  id: number;
  name: string;
  short_name: string;
}

export interface Language {
  id: number;
  name: string;
  code: string;
}

export interface Country {
  id: number;
  name: string;
  short_name?: string;
  code?: string;
  language_id?: number;
  currency_symbol?: string;
}

export interface SpecialtiesResponse {
  specialties: Specialty[];
  count: number;
}

export interface LanguagesResponse {
  languages: Language[];
  count: number;
}

export interface CountriesResponse {
  countries: Country[];
  count: number;
}

// Basic Doctor interface for API responses and hooks
export interface Doctor {
  id: number;
  user_id?: number | null;
  name: string;
  first_name?: string;
  last_name?: string;
  prefix?: string;
  email?: string;
  specialty_name?: string;
  specialty_id?: number;
  super_category_id?: number;
  language_id?: number;
  language_name?: string;
  gender?: string;
  rating?: number | null;
  review_count?: number;
  phone?: string;
  address?: string;
  image?: string;
  role?: string;
  display_name?: string;
  full_name?: string;
  specialty?: string;
  is_local?: boolean;
  is_verified?: boolean;
  distance?: number;
  latitude?: number;
  longitude?: number;
  availability_status?: 'available' | 'busy' | 'offline';
  search_mode?: 'local' | 'international';
  is_same_country?: boolean;
}
