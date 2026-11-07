/**
 * React Query keys for doctor profile data
 */

export const doctorQueryKeys = {
  // All doctor data
  all: ['doctor'] as const,

  // Doctor Profile
  profile: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'profile', doctorId] as const)
      : (['doctor', 'profile'] as const),

  // Specialties
  specialties: () => ['doctor', 'specialties'] as const,
  specialtiesPublic: () => ['public', 'specialties'] as const,

  // Languages
  languages: () => ['doctor', 'languages'] as const,

  // Countries
  countries: () => ['doctor', 'countries'] as const,

  // Working Hours
  workingHours: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'workingHours', doctorId] as const)
      : (['doctor', 'workingHours'] as const),

  // Locations
  locations: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'locations', doctorId] as const)
      : (['doctor', 'locations'] as const),

  // Procedures
  procedures: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'procedures', doctorId] as const)
      : (['doctor', 'procedures'] as const),

  // Practice Info
  practiceInfo: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'practiceInfo', doctorId] as const)
      : (['doctor', 'practiceInfo'] as const),

  // Contact Info
  contactInfo: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'contactInfo', doctorId] as const)
      : (['doctor', 'contactInfo'] as const),

  // Professional Info
  professionalInfo: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'professionalInfo', doctorId] as const)
      : (['doctor', 'professionalInfo'] as const),

  // Patient Activity
  patientActivity: (doctorId?: number) =>
    doctorId
      ? (['doctor', 'patientActivity', doctorId] as const)
      : (['doctor', 'patientActivity'] as const),
} as const;
