import { medicusUserApi } from '@/utils/infrastructure/typedApiClient';

export type VitalCategory =
  | 'vitals'
  | 'lifestyle'
  | 'body_metrics'
  | 'vaccines'
  | 'immunization'
  | 'biological'
  | 'reproductive'
  | 'other';

export type TrendIndicator = 'H' | 'L' | 'S' | null;

// ============================================================
// NEW: Threshold Models (Data-Driven)
// ============================================================

export interface VitalThresholdZone {
  min: number | null; // null = open-ended low
  max: number | null; // null = open-ended high
  color: string; // Hex color code
  label: string; // Display label (e.g., "Normal", "High")
  status?: string; // Optional status key
}

export interface VitalThresholdConfig {
  gender: string; // 'M', 'F', or 'ALL'
  age_min: number;
  age_max: number;
  zones: VitalThresholdZone[];
}

// ============================================================
// NEW: Simplified Vital Entry (matches new view schema)
// ============================================================

/**
 * NEW VIEW SCHEMA (medical_vitals_latest_view):
 * - vital_id: FK to vital_reference_ranges (resolved by coding job)
 * - vital_text: Raw clinician input (what doctor typed)
 * - vital_key: Standardized vital key from JSONB
 * - display_name: Resolved from reference or fallback
 */
export interface MedicalVitalEntry {
  id: number;
  vital_id?: number; // FK to vital_reference_ranges (NULL if not yet coded)
  vital_text?: string; // Raw clinician input in their language
  vital_key?: string; // Standardized vital key
  vital_name?: string; // Deprecated, use vital_key
  display_name: string;
  vital_value: string; // The value of the vital
  unit?: string;
  vital_category?: string;
  recorded_at: string;
  doctor_name?: string;
  healthcare_provider_name?: string;

  // Optional enriched fields (for AI tools, not from basic API)
  trend?: TrendIndicator;
  threshold_config?: VitalThresholdConfig;
}

export interface MedicalVitalsResponse {
  patient_id: number;
  vitals: MedicalVitalEntry[];
  lifestyle: MedicalVitalEntry[];
  body_metrics: MedicalVitalEntry[];
  vaccines: MedicalVitalEntry[];
  immunization: MedicalVitalEntry[];
  biological: MedicalVitalEntry[];
  reproductive: MedicalVitalEntry[];
  other: MedicalVitalEntry[];
  counts: {
    vitals: number;
    lifestyle: number;
    body_metrics: number;
    vaccines: number;
    immunization: number;
    biological: number;
    reproductive: number;
    other: number;
    total: number;
  };
}

export interface VitalHistoryPoint {
  value: string;
  unit: string;
  display_name: string;
  recorded_at: string;
  doctor_name?: string;
  healthcare_provider_name?: string;

  // Optional enriched fields
  trend?: TrendIndicator;
  threshold_config?: VitalThresholdConfig;
}

export interface VitalHistoryResponse {
  patient_id: number;
  vital_key: string; // Standardized vital key
  vital_name?: string; // Deprecated, use vital_key
  history: VitalHistoryPoint[];
  total_count: number;
}

// ============================================================
// DEPRECATED: Old types (for backward compatibility)
// ============================================================

/** @deprecated Use MedicalVitalEntry instead */
export type StatusSegment =
  | 'NORMAL'
  | 'MODERATE_HIGH'
  | 'CONCERNING_HIGH'
  | 'EMERGENCY_HIGH'
  | 'CONCERNING_LOW'
  | 'EMERGENCY_LOW'
  | 'UNKNOWN';

/** @deprecated Old vital entry with hardcoded threshold fields - no longer returned by API */
export interface LegacyMedicalVitalEntry {
  id: number;
  category: VitalCategory;
  display_name: string;
  vital_name: string;
  vital_value: string;
  unit: string;
  trend_indicator: TrendIndicator;
  status_segment: StatusSegment;
  bar_position_percent: number;
  assigned_color_index: number;
  source?: 'manual' | 'device' | 'import';
  recorded_at: string;
  doctor_name?: string;
  healthcare_provider_name?: string;
}

// ============================================================
// API Functions
// ============================================================

export const getPatientVitals = async (
  patientId: number
): Promise<MedicalVitalsResponse> => {
  return await medicusUserApi.get<MedicalVitalsResponse>(
    `vitals/patients/${patientId}`
  );
};

export const getVitalHistory = async (
  patientId: number,
  vitalId: number,
  limit: number = 30
): Promise<VitalHistoryResponse> => {
  return await medicusUserApi.get<VitalHistoryResponse>(
    `vitals/patients/${patientId}/history/${vitalId}`,
    { params: { limit } }
  );
};