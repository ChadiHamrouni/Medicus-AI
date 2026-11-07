/**
 * React Query keys for patient medical data
 *
 * Centralized query key management for type safety and cache invalidation.
 * Keys are hierarchical: ['medical', 'conditions', patientId] allows invalidating
 * all conditions, or just for a specific patient.
 */

export const medicalQueryKeys = {
  // All medical data
  all: ['medical'] as const,

  // Conditions
  conditions: (patientId: number | null) =>
    ['medical', 'conditions', patientId] as const,

  // Vitals
  vitals: (patientId: number | null) =>
    ['medical', 'vitals', patientId] as const,

  // Medical Events (Health Calendar)
  events: (patientId: number | null, limit: number = 500, offset: number = 0) =>
    ['medical', 'events', patientId, { limit, offset }] as const,

  // Medications (for future migration from Zustand)
  medications: (
    patientId: number | null,
    limit: number = 100,
    offset: number = 0
  ) => ['medical', 'medications', patientId, { limit, offset }] as const,
} as const;
