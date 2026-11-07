import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  getDependents,
  getDependentById,
  updateDependent,
  updatePatientProfile,
  getCurrentMedications,
} from '@/services';
import { logger } from '@/utils';

export interface ContactData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country_id?: number;
  country_name?: string; // Denormalized for immediate display
}

export interface EmergencyContactData {
  emergency_contact: EmergencyContactItem[];
  alternateContactName?: string;
  alternateContactPhone?: string;
  alternateContactRelationship?: string;
  alternateContactEmail?: string;
}

export interface EmergencyContactItem {
  name: string;
  relationship: string;
  phone_number: string;
  country_code?: string | null;
  email?: string | null;
  address?: Record<string, any> | null;
  is_primary?: boolean;
}

export interface EmergencyContactPayload {
  name: string;
  phone_number: string;
  country_code?: string;
  relationship: string;
  email?: string;
  is_primary: boolean;
  address?: Record<string, string>;
}

export interface MedicationData {
  id: number;
  medication_name: string;
  strength: string | null;
  form: string | null;
  dose: string | null;
  frequency: string | null;
  time_of_day: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'current' | 'previous';
  duration_days: number | null;
  days_taken: number | null;
  days_left: number | null;
  purpose: string | null;
  instructions: string | null;
  prescribed_by: string | null;
  prescribed_at: string | null;
  source: string | null;
  timing?: string | null;
}

export interface MedicationsData {
  currentMedications: MedicationData[];
  activeMedicationsCount: number;
  lastUpdated: string | null;
}

export interface MedicalVisitData {
  visit_id: number;
  date: string;
  end_time?: string;
  doctor_id: number;
  created_by: number;
  visit_type: string;
  visit_details: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

export interface MedicalHistoryData {
  pastVisits: MedicalVisitData[];
  totalVisitsCount: number;
  lastUpdated: string | null;
}

export interface PatientData {
  id: number | string;
  contactInfo: ContactData;
  emergencyContact: EmergencyContactData;
  medications: MedicationsData;
  medicalHistory: MedicalHistoryData;
  rawData: any; // Store the original API response for other components that might need it
  lastFetched: number;
  isStale: boolean;
}

interface PatientDataStore {
  // Cache for all patient data by patient/dependent ID
  patientCache: Record<string, PatientData>;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Error state
  errors: Record<string, string | null>;

  // Cache management
  CACHE_DURATION: number; // 5 minutes

  // Actions
  getPatientData: (_patientId: string | 'main') => PatientData | null;
  getContactData: (_patientId: string | 'main') => ContactData | null;
  getEmergencyContactData: (
    _patientId: string | 'main'
  ) => EmergencyContactData | null;
  getMedicationsData: (_patientId: string | 'main') => MedicationsData | null;
  getMedicalHistoryData: (
    _patientId: string | 'main'
  ) => MedicalHistoryData | null;
  loadPatientData: (
    _patientId: string | 'main',
    _force?: boolean
  ) => Promise<void>;
  loadMedicationsOnly: (
    _patientId: string | 'main',
    _actualPatientId: number
  ) => Promise<void>;
  loadContactDataOnly: (_patientId: string | 'main', _patientData: any) => void;
  loadEmergencyContactDataOnly: (
    _patientId: string | 'main',
    _patientData: any
  ) => void;
  loadMedicalHistoryDataOnly: (
    _patientId: string | 'main',
    _patientData: any
  ) => void;
  updateContactDataOptimistic: (
    _patientId: string | 'main',
    _updates: Partial<ContactData>
  ) => void;
  updateEmergencyContactDataOptimistic: (
    _patientId: string | 'main',
    _updates: Partial<EmergencyContactData>
  ) => void;
  updateMedicationsDataOptimistic: (
    _patientId: string | 'main',
    _updates: Partial<MedicationsData>
  ) => void;
  updateMedicalHistoryDataOptimistic: (
    _patientId: string | 'main',
    _updates: Partial<MedicalHistoryData>
  ) => void;
  saveContactData: (
    _patientId: string | 'main',
    _data: Partial<ContactData>,
    _isAddress?: boolean
  ) => Promise<boolean>;
  saveEmergencyContactData: (
    _patientId: string | 'main',
    _data: EmergencyContactData
  ) => Promise<boolean>;
  saveMedicationsData: (
    _patientId: string | 'main',
    _data: MedicationData[]
  ) => Promise<boolean>;
  saveMedicalHistoryData: (
    _patientId: string | 'main',
    _data: MedicalVisitData[]
  ) => Promise<boolean>;
  clearCache: (_patientId?: string | 'main') => void;
  getError: (_patientId: string | 'main') => string | null;
  setError: (_patientId: string | 'main', _error: string | null) => void;
  clearError: (_patientId: string | 'main') => void;
  isDataStale: (_patientId: string | 'main') => boolean;
}

// Helper function to extract contact data from API response
const extractContactData = (apiData: any): ContactData => {
  // Handle address field - it can be either an object or a string
  let addressData: any = {};
  let streetAddress = '';

  if (apiData?.address) {
    if (typeof apiData.address === 'object' && apiData.address !== null) {
      // Address is an object
      addressData = apiData.address;
      streetAddress = addressData.address || addressData.street || '';
    } else if (typeof apiData.address === 'string') {
      // Address is already a string
      streetAddress = apiData.address;
    }
  }

  return {
    firstName: apiData?.first_name || '',
    lastName: apiData?.last_name || '',
    dateOfBirth: apiData?.dob || '',
    gender: apiData?.gender || '',
    address: streetAddress,
    city: addressData?.city || apiData?.city || '',
    state: addressData?.state || apiData?.state || '',
    zipCode: addressData?.zip_code || apiData?.zip_code || '',
  };
};

// Helper function to extract medications data from API response
// NOTE: This is a legacy fallback. The system now uses the dedicated medications API endpoint.
// This function only handles the case where the API fails and returns empty data.
const extractMedicationsData = (_apiData: any): MedicationsData => {
  // Return empty medications data - dedicated API endpoint should be used instead
  return {
    currentMedications: [],
    activeMedicationsCount: 0,
    lastUpdated: null,
  };
};

// Helper function to extract medical history data from API response
const extractMedicalHistoryData = (apiData: any): MedicalHistoryData => {
  const pastMedicalVisits = apiData?.past_medical_visits || [];

  if (!Array.isArray(pastMedicalVisits)) {
    return {
      pastVisits: [],
      totalVisitsCount: 0,
      lastUpdated: null,
    };
  }

  // Transform past_medical_visits into MedicalVisitData format
  const visits: MedicalVisitData[] = pastMedicalVisits.map((visit: any) => ({
    visit_id: visit.id || 0,
    date: visit.date || '',
    end_time: visit.end_time || undefined,
    doctor_id: visit.doctor_id || 0,
    created_by: visit.created_by || 0,
    visit_type: visit.visit_type || 'General',
    visit_details: visit.visit_details || '',
    diagnosis: visit.diagnosis || undefined,
    treatment: visit.treatment || undefined,
    notes: visit.notes || undefined,
  }));

  return {
    pastVisits: visits,
    totalVisitsCount: visits.length,
    lastUpdated: new Date().toISOString(),
  };
};

// Helper function to extract emergency contact data from API response
const extractEmergencyContactData = (apiData: any): EmergencyContactData => {
  const emergencyContact = apiData?.emergency_contact;

  const normalize = (
    c: any,
    defaultIsPrimary = false
  ): EmergencyContactItem => ({
    name: c?.name || c?.contactName || c?.contact_name || '',
    relationship: c?.relationship || c?.relationship_type || '',
    phone_number: (c?.phone_number ||
      c?.phone ||
      c?.contactPhone ||
      c?.contact_phone ||
      '') as string,
    country_code: c?.country_code ?? null,
    email: c?.email ?? null,
    address: c?.address ?? null,
    is_primary:
      typeof c?.is_primary === 'boolean' ? c.is_primary : defaultIsPrimary,
  });

  if (!emergencyContact) {
    return {
      emergency_contact: [],
    };
  }

  if (Array.isArray(emergencyContact)) {
    const normalized = emergencyContact.map((c: any, idx: number) =>
      normalize(c, idx === 0)
    );
    return {
      emergency_contact: normalized,
    };
  }

  if (
    emergencyContact &&
    typeof emergencyContact === 'object' &&
    'is_primary' in emergencyContact
  ) {
    const normalized = [
      normalize(emergencyContact, emergencyContact.is_primary),
    ];
    return {
      emergency_contact: normalized,
    };
  }

  // Legacy object shapes: { primary: {...}, secondary: {...} }
  if (emergencyContact.primary) {
    const primary = normalize(emergencyContact.primary, true);
    const secondary = emergencyContact.secondary
      ? normalize(emergencyContact.secondary, false)
      : undefined;
    const arr = secondary ? [primary, secondary] : [primary];
    return {
      emergency_contact: arr,
    };
  }

  // Legacy single object format (without is_primary)
  if (
    emergencyContact.name ||
    emergencyContact.phone ||
    emergencyContact.phone_number
  ) {
    const single = normalize(emergencyContact, true);
    return {
      emergency_contact: [single],
    };
  }

  return {
    emergency_contact: [],
  };
};

export const usePatientStore = create<PatientDataStore>()(
  subscribeWithSelector((set, get) => ({
    patientCache: {},
    isLoading: false,
    isSaving: false,
    errors: {},
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    getPatientData: (patientId: string | 'main') => {
      const cacheEntry = get().patientCache[patientId];
      return cacheEntry || null;
    },

    getContactData: (patientId: string | 'main') => {
      const patientData = get().getPatientData(patientId);
      return patientData?.contactInfo || null;
    },

    getEmergencyContactData: (patientId: string | 'main') => {
      const patientData = get().getPatientData(patientId);
      return patientData?.emergencyContact || null;
    },

    getMedicationsData: (patientId: string | 'main') => {
      const patientData = get().getPatientData(patientId);
      return patientData?.medications || null;
    },

    getMedicalHistoryData: (patientId: string | 'main') => {
      const patientData = get().getPatientData(patientId);
      return patientData?.medicalHistory || null;
    },

    isDataStale: (patientId: string | 'main') => {
      const patientData = get().patientCache[patientId];
      if (!patientData) return true;

      const now = Date.now();
      const isExpired = now - patientData.lastFetched > get().CACHE_DURATION;
      return isExpired || patientData.isStale;
    },

    loadPatientData: async (patientId: string | 'main', force = false) => {
      const state = get();

      // Check if we need to load data
      if (!force && !state.isDataStale(patientId)) {
        logger.info('Patient data is fresh, skipping fetch', {
          component: 'patientStore',
          patientId,
          lastFetched: state.patientCache[patientId]?.lastFetched,
        });
        return;
      }

      set(state => {
        const newErrors = { ...state.errors };
        delete newErrors[`${patientId}:patient`];
        return {
          ...state,
          errors: newErrors,
          isLoading: true,
        };
      });

      try {
        let apiData: any = null;

        if (patientId === 'main') {
          // First try loading from AsyncStorage (for doctors in patient mode)
          try {
            const AsyncStorage =
              await import('@react-native-async-storage/async-storage');
            const cachedPatientData = await AsyncStorage.default.getItem(
              '@MediApp:patientProfile'
            );

            if (cachedPatientData) {
              apiData = JSON.parse(cachedPatientData);
              logger.info('Loaded main patient data from AsyncStorage cache', {
                component: 'patientStore',
                patientId: 'main',
                hasFirstName: !!apiData?.first_name,
                hasLastName: !!apiData?.last_name,
              });
            }
          } catch {}

          // If AsyncStorage didn't have data, try the API
          if (!apiData) {
            const response = await getDependents(true);
            apiData = response.main_patient;
          }
        } else {
          // Load dependent data
          apiData = await getDependentById(Number(patientId));
        }

        if (apiData) {
          // Fetch medications from the dedicated endpoint
          let medicationsData: MedicationsData;
          try {
            const medResponse = await getCurrentMedications(
              apiData.id || Number(patientId)
            );
            const allMeds = [...medResponse.current, ...medResponse.previous];
            medicationsData = {
              currentMedications: allMeds,
              activeMedicationsCount: medResponse.counts.current,
              lastUpdated: new Date().toISOString(),
            };
          } catch (error) {
            logger.error(
              'Failed to fetch medications, using fallback',
              error as Error
            );
            medicationsData = extractMedicationsData(apiData);
          }

          const patientData: PatientData = {
            id: apiData.id || patientId,
            contactInfo: extractContactData(apiData),
            emergencyContact: extractEmergencyContactData(apiData),
            medications: medicationsData,
            medicalHistory: extractMedicalHistoryData(apiData),
            rawData: apiData,
            lastFetched: Date.now(),
            isStale: false,
          };

          set(state => ({
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: patientData,
            },
            isLoading: false,
          }));

          logger.info('Patient data loaded successfully', {
            component: 'patientStore',
            patientId,
            hasContactData: Object.values(patientData.contactInfo).some(
              v => v !== ''
            ),
            hasEmergencyContact:
              patientData.emergencyContact.emergency_contact.length > 0,
          });
        } else {
          // Create empty data structure
          const emptyPatientData: PatientData = {
            id: patientId,
            contactInfo: extractContactData(null),
            emergencyContact: extractEmergencyContactData(null),
            medications: extractMedicationsData(null),
            medicalHistory: extractMedicalHistoryData(null),
            rawData: null,
            lastFetched: Date.now(),
            isStale: false,
          };

          set(state => ({
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: emptyPatientData,
            },
            isLoading: false,
          }));
        }
      } catch (error) {
        logger.error('Failed to load patient data:', error as Error, {
          component: 'patientStore',
          patientId,
        });

        set(state => ({
          ...state,
          errors: {
            ...state.errors,
            [`${patientId}:patient`]: 'Failed to load patient data',
          },
          isLoading: false,
        }));
      }
    },

    // Load only medications data without refetching patient/dependent data
    loadMedicationsOnly: async (
      patientId: string | 'main',
      actualPatientId: number
    ) => {
      const state = get();

      // Check if medications are already fresh
      const cachedData = state.patientCache[patientId];
      if (
        cachedData?.medications &&
        !state.isDataStale(patientId) &&
        cachedData.medications.currentMedications.length > 0
      ) {
        logger.info('Medications data is fresh, skipping fetch', {
          component: 'patientStore',
          patientId,
          medicationsCount: cachedData.medications.currentMedications.length,
        });
        return;
      }

      set(state => {
        const newErrors = { ...state.errors };
        delete newErrors[`${patientId}:medications`];
        return {
          ...state,
          errors: newErrors,
          isLoading: true,
        };
      });

      try {
        // Fetch only medications from the dedicated endpoint
        const medResponse = await getCurrentMedications(actualPatientId);
        const allMeds = [...medResponse.current, ...medResponse.previous];
        const medicationsData: MedicationsData = {
          currentMedications: allMeds,
          activeMedicationsCount: medResponse.counts.current,
          lastUpdated: new Date().toISOString(),
        };

        // Update only medications in the cache
        set(state => ({
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...(state.patientCache[patientId] || {
                id: patientId,
                contactInfo: extractContactData(null),
                emergencyContact: extractEmergencyContactData(null),
                medicalHistory: extractMedicalHistoryData(null),
                rawData: null,
                isStale: false,
              }),
              medications: medicationsData,
              lastFetched: Date.now(),
              isStale: false,
            },
          },
          isLoading: false,
        }));

        logger.info('Medications loaded successfully', {
          component: 'patientStore',
          patientId,
          medicationsCount: allMeds.length,
        });
      } catch (error) {
        logger.error('Failed to load medications:', error as Error, {
          component: 'patientStore',
          patientId,
        });

        set(state => ({
          ...state,
          errors: {
            ...state.errors,
            [`${patientId}:medications`]: 'Failed to load medications',
          },
          isLoading: false,
        }));
      }
    },

    // Load contact data from already-cached patient data (no API call)
    loadContactDataOnly: (patientId: string | 'main', patientData: any) => {
      if (!patientData) {
        logger.warn('No patient data provided to loadContactDataOnly', {
          component: 'patientStore',
          patientId,
        });
        return;
      }

      const contactInfo = extractContactData(patientData);

      // Update only contact info in the cache
      set(state => ({
        ...state,
        patientCache: {
          ...state.patientCache,
          [patientId]: {
            ...(state.patientCache[patientId] || {
              id: patientId,
              medications: extractMedicationsData(null),
              emergencyContact: extractEmergencyContactData(null),
              medicalHistory: extractMedicalHistoryData(null),
              rawData: null,
              isStale: false,
              lastFetched: Date.now(),
            }),
            contactInfo,
            rawData: patientData,
            lastFetched: Date.now(),
            isStale: false,
          },
        },
      }));

      logger.info('Contact data loaded from cached patient data', {
        component: 'patientStore',
        patientId,
        hasFirstName: !!contactInfo.firstName,
        hasLastName: !!contactInfo.lastName,
      });
    },

    // Load emergency contact data from already-cached patient data (no API call)
    loadEmergencyContactDataOnly: (
      patientId: string | 'main',
      patientData: any
    ) => {
      if (!patientData) {
        logger.warn(
          'No patient data provided to loadEmergencyContactDataOnly',
          {
            component: 'patientStore',
            patientId,
          }
        );
        return;
      }

      const emergencyContact = extractEmergencyContactData(patientData);

      // Update only emergency contact info in the cache
      set(state => ({
        ...state,
        patientCache: {
          ...state.patientCache,
          [patientId]: {
            ...(state.patientCache[patientId] || {
              id: patientId,
              contactInfo: extractContactData(null),
              medications: extractMedicationsData(null),
              medicalHistory: extractMedicalHistoryData(null),
              rawData: null,
              isStale: false,
              lastFetched: Date.now(),
            }),
            emergencyContact,
            rawData: patientData,
            lastFetched: Date.now(),
            isStale: false,
          },
        },
      }));

      logger.info('Emergency contact data loaded from cached patient data', {
        component: 'patientStore',
        patientId,
        contactCount: emergencyContact.emergency_contact.length,
      });
    },

    // Load medical history data from already-cached patient data (no API call)
    loadMedicalHistoryDataOnly: (
      patientId: string | 'main',
      patientData: any
    ) => {
      if (!patientData) {
        logger.warn('No patient data provided to loadMedicalHistoryDataOnly', {
          component: 'patientStore',
          patientId,
        });
        return;
      }

      const medicalHistory = extractMedicalHistoryData(patientData);

      // Update only medical history in the cache
      set(state => ({
        ...state,
        patientCache: {
          ...state.patientCache,
          [patientId]: {
            ...(state.patientCache[patientId] || {
              id: patientId,
              contactInfo: extractContactData(null),
              emergencyContact: extractEmergencyContactData(null),
              medications: extractMedicationsData(null),
              rawData: null,
              isStale: false,
              lastFetched: Date.now(),
            }),
            medicalHistory,
            rawData: patientData,
            lastFetched: Date.now(),
            isStale: false,
          },
        },
      }));

      logger.info('Medical history data loaded from cached patient data', {
        component: 'patientStore',
        patientId,
        visitsCount: medicalHistory.pastVisits.length,
      });
    },

    updateContactDataOptimistic: (
      patientId: string | 'main',
      updates: Partial<ContactData>
    ) => {
      set(state => {
        const currentPatient = state.patientCache[patientId];
        if (!currentPatient) {
          // Initialize empty patient data if it doesn't exist
          const emptyPatientData: PatientData = {
            id: patientId,
            contactInfo: extractContactData(null),
            emergencyContact: extractEmergencyContactData(null),
            medications: extractMedicationsData(null),
            medicalHistory: extractMedicalHistoryData(null),
            rawData: null,
            lastFetched: Date.now(),
            isStale: false,
          };

          return {
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...emptyPatientData,
                contactInfo: { ...emptyPatientData.contactInfo, ...updates },
              },
            },
          };
        }

        return {
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...currentPatient,
              contactInfo: { ...currentPatient.contactInfo, ...updates },
            },
          },
        };
      });

      logger.info('Applied optimistic contact data update', {
        component: 'patientStore',
        patientId,
        updates: Object.keys(updates),
      });
    },

    updateEmergencyContactDataOptimistic: (
      patientId: string | 'main',
      updates: Partial<EmergencyContactData>
    ) => {
      set(state => {
        const currentPatient = state.patientCache[patientId];
        if (!currentPatient) {
          // Initialize empty patient data if it doesn't exist
          const emptyPatientData: PatientData = {
            id: patientId,
            contactInfo: extractContactData(null),
            emergencyContact: extractEmergencyContactData(null),
            medications: extractMedicationsData(null),
            medicalHistory: extractMedicalHistoryData(null),
            rawData: null,
            lastFetched: Date.now(),
            isStale: false,
          };

          return {
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...emptyPatientData,
                emergencyContact: {
                  ...emptyPatientData.emergencyContact,
                  ...updates,
                },
              },
            },
          };
        }

        return {
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...currentPatient,
              emergencyContact: {
                ...currentPatient.emergencyContact,
                ...updates,
              },
            },
          },
        };
      });

      logger.info('Applied optimistic emergency contact data update', {
        component: 'patientStore',
        patientId,
        updates: Object.keys(updates),
      });
    },

    updateMedicationsDataOptimistic: (
      patientId: string | 'main',
      updates: Partial<MedicationsData>
    ) => {
      set(state => {
        const currentPatient = state.patientCache[patientId];
        if (!currentPatient) {
          // Initialize empty patient data if it doesn't exist
          const emptyPatientData: PatientData = {
            id: patientId,
            contactInfo: extractContactData(null),
            emergencyContact: extractEmergencyContactData(null),
            medications: extractMedicationsData(null),
            medicalHistory: extractMedicalHistoryData(null),
            rawData: null,
            lastFetched: Date.now(),
            isStale: false,
          };

          return {
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...emptyPatientData,
                medications: { ...emptyPatientData.medications, ...updates },
              },
            },
          };
        }

        return {
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...currentPatient,
              medications: { ...currentPatient.medications, ...updates },
            },
          },
        };
      });

      logger.info('Applied optimistic medications data update', {
        component: 'patientStore',
        patientId,
        updates: Object.keys(updates),
      });
    },

    updateMedicalHistoryDataOptimistic: (
      patientId: string | 'main',
      updates: Partial<MedicalHistoryData>
    ) => {
      set(state => {
        const currentPatient = state.patientCache[patientId];
        if (!currentPatient) {
          // Initialize empty patient data if it doesn't exist
          const emptyPatientData: PatientData = {
            id: patientId,
            contactInfo: extractContactData(null),
            emergencyContact: extractEmergencyContactData(null),
            medications: extractMedicationsData(null),
            medicalHistory: extractMedicalHistoryData(null),
            rawData: null,
            lastFetched: Date.now(),
            isStale: false,
          };

          return {
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...emptyPatientData,
                medicalHistory: {
                  ...emptyPatientData.medicalHistory,
                  ...updates,
                },
              },
            },
          };
        }

        return {
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...currentPatient,
              medicalHistory: { ...currentPatient.medicalHistory, ...updates },
            },
          },
        };
      });

      logger.info('Applied optimistic medical history data update', {
        component: 'patientStore',
        patientId,
        updates: Object.keys(updates),
      });
    },

    saveContactData: async (
      patientId: string | 'main',
      data: Partial<ContactData>,
      isAddress = false
    ) => {
      set(state => {
        const newErrors = { ...state.errors };
        delete newErrors[`${patientId}:contact`];
        return {
          ...state,
          errors: newErrors,
          isSaving: true,
        };
      });

      // Store original data for rollback
      const originalContactData = get().getContactData(patientId);

      // Apply optimistic update
      get().updateContactDataOptimistic(patientId, data);

      try {
        // Prepare the update payload
        const updatePayload: any = {};

        if (isAddress) {
          // Address fields
          if (data.address !== undefined)
            updatePayload.address = data.address.trim() || undefined;
          if (data.city !== undefined)
            updatePayload.city = data.city.trim() || undefined;
          if (data.state !== undefined)
            updatePayload.state = data.state.trim() || undefined;
          if (data.zipCode !== undefined)
            updatePayload.zip_code = data.zipCode.trim() || undefined;
          if (data.country_id !== undefined)
            updatePayload.country_id = data.country_id;
        }

        // Remove undefined values
        const filteredPayload = Object.fromEntries(
          Object.entries(updatePayload).filter(
            ([_, value]) => value !== undefined
          )
        );

        if (Object.keys(filteredPayload).length === 0) {
          throw new Error('No valid fields to update');
        }

        // Save to backend
        if (patientId === 'main') {
          // Get main patient ID first
          const response = await getDependents(true);
          const mainPatient = response.main_patient;

          if (!mainPatient) {
            throw new Error('Unable to find main patient data');
          }

          await updatePatientProfile(filteredPayload, mainPatient.id);
        } else {
          // For dependents
          if (isAddress) {
            throw new Error('Address updates not supported for dependents');
          }
          await updateDependent(Number(patientId), filteredPayload);
        }

        // Mark cache as fresh after successful save
        set(state => ({
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...state.patientCache[patientId],
              lastFetched: Date.now(),
              isStale: false,
            },
          },
          isSaving: false,
        }));

        logger.info('Contact data saved successfully', {
          component: 'patientStore',
          patientId,
          isAddress,
          updatedFields: Object.keys(filteredPayload),
        });

        return true;
      } catch (error) {
        logger.error('Failed to save contact data:', error as Error, {
          component: 'patientStore',
          patientId,
          isAddress,
        });

        // Rollback optimistic update
        if (originalContactData) {
          get().updateContactDataOptimistic(patientId, originalContactData);
          set(state => ({
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...state.patientCache[patientId],
                isStale: true,
              },
            },
          }));
        }

        set(state => ({
          ...state,
          errors: {
            ...state.errors,
            [`${patientId}:contact`]:
              (error as Error).message || 'Failed to save contact data',
          },
          isSaving: false,
        }));

        return false;
      }
    },

    saveEmergencyContactData: async (
      patientId: string | 'main',
      data: EmergencyContactData
    ) => {
      set(state => ({
        ...state,
        isSaving: true,
        error: null,
      }));

      // Store original data for rollback
      const originalEmergencyContactData =
        get().getEmergencyContactData(patientId);

      // Apply optimistic update
      get().updateEmergencyContactDataOptimistic(patientId, data);

      // Prepare payload for potential error logging
      let payloadForErrorLogging: any = null;

      try {
        // Validate that we have at least one emergency contact
        if (!data.emergency_contact || data.emergency_contact.length === 0) {
          throw new Error('Please provide at least one emergency contact.');
        }

        // Validate each contact in the array
        const validatedContacts: EmergencyContactPayload[] = [];

        for (const contact of data.emergency_contact) {
          const name = contact.name.trim();
          const phone = contact.phone_number.trim().replace(/\D/g, '');
          const relationship = contact.relationship.trim();
          const email = contact.email?.trim();

          if (relationship.length === 0 || relationship.length > 50) {
            throw new Error(
              'Relationship must be between 1 and 50 characters.'
            );
          }

          // Validate email format if provided
          if (email && email.length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              throw new Error('Please provide a valid email address.');
            }
          }

          const validatedContact = {
            name,
            phone_number: phone,
            relationship,
            is_primary: contact.is_primary ?? false,
            ...(contact.country_code && { country_code: contact.country_code }),
            ...(email && { email }),
            ...(contact.address && {
              address: contact.address as Record<string, string>,
            }),
          };

          validatedContacts.push(validatedContact);
        }

        // Prepare secondary/alternate contact if provided
        let secondaryContactPayload: EmergencyContactPayload | undefined;
        if (data.alternateContactName && data.alternateContactPhone) {
          const altName = data.alternateContactName.trim();
          const altPhone = data.alternateContactPhone.trim().replace(/\D/g, '');
          const altRelationship = data.alternateContactRelationship?.trim();
          const altEmail = data.alternateContactEmail?.trim();

          // Validate alternate contact fields if provided
          if (altName.length > 0 && altPhone.length >= 10) {
            secondaryContactPayload = {
              name: altName,
              phone_number: altPhone,
              relationship: altRelationship || 'Other',
              is_primary: false,
              ...(altEmail && altEmail.length > 0 && { email: altEmail }),
            };
          }
        }

        logger.info('Emergency contact payload validation passed', {
          component: 'patientStore',
          patientId,
          contactsCount: validatedContacts.length,
        });

        // Store payload for error logging
        payloadForErrorLogging = validatedContacts;

        // Save to backend - send the array
        if (patientId === 'main') {
          // Get main patient ID first
          const response = await getDependents(true);
          const mainPatient = response.main_patient;

          if (!mainPatient) {
            throw new Error('Unable to find main patient data');
          }

          logger.info('Saving emergency contacts for main patient', {
            component: 'patientStore',
            patientId: mainPatient.id,
            contactsCount: validatedContacts.length,
          });

          try {
            const apiPayload = validatedContacts.map(contact => ({
              ...contact,
              phone: contact.phone_number,
            }));

            logger.info('Sending emergency contact payload to API', {
              component: 'patientStore',
              patientId: mainPatient.id,
              payload: apiPayload,
            });

            await updatePatientProfile(
              {
                emergency_contact: apiPayload as any,
              },
              mainPatient.id
            );

            logger.info(
              'Main patient emergency contacts updated successfully',
              {
                component: 'patientStore',
                patientId: mainPatient.id,
                updatedPrimary: true,
                updatedSecondary: !!secondaryContactPayload,
              }
            );
          } catch (apiError) {
            logger.error(
              'API call to updatePatientProfile failed',
              apiError instanceof Error
                ? apiError
                : new Error(String(apiError)),
              {
                component: 'patientStore',
                patientId: mainPatient.id,
                apiErrorMessage:
                  apiError instanceof Error
                    ? apiError.message
                    : String(apiError),
              }
            );
            throw apiError;
          }
        } else {
          // For dependents
          logger.info('Saving emergency contacts for dependent', {
            component: 'patientStore',
            dependentId: Number(patientId),
            contactsCount: validatedContacts.length,
          });

          try {
            const apiPayload = validatedContacts.map(contact => ({
              ...contact,
              phone: contact.phone_number,
            }));

            logger.info(
              'Sending emergency contact payload to API (dependent)',
              {
                component: 'patientStore',
                dependentId: Number(patientId),
                payload: apiPayload,
              }
            );

            await updateDependent(Number(patientId), {
              emergency_contact: apiPayload as any,
            });

            logger.info('Dependent emergency contacts updated successfully', {
              component: 'patientStore',
              dependentId: Number(patientId),
              updatedPrimary: true,
              updatedSecondary: !!secondaryContactPayload,
            });
          } catch (apiError) {
            logger.error(
              'API call to updateDependent failed',
              apiError instanceof Error
                ? apiError
                : new Error(String(apiError)),
              {
                component: 'patientStore',
                dependentId: Number(patientId),
                apiErrorMessage:
                  apiError instanceof Error
                    ? apiError.message
                    : String(apiError),
              }
            );
            throw apiError;
          }
        }

        // Mark cache as fresh after successful save
        set(state => ({
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...state.patientCache[patientId],
              lastFetched: Date.now(),
              isStale: false,
            },
          },
          isSaving: false,
        }));

        logger.info('Emergency contact data saved successfully', {
          component: 'patientStore',
          patientId,
          contactsCount: validatedContacts.length,
        });

        return true;
      } catch (error) {
        // Handle null/undefined errors
        if (!error) {
          const unknownError = new Error(
            'An unknown error occurred while saving emergency contact data'
          );
          logger.error(
            'Failed to save emergency contact data: Unknown error',
            unknownError,
            {
              component: 'patientStore',
              patientId,
              errorMessage: 'Unknown error',
              errorStack: null,
              payload: payloadForErrorLogging,
              rawError: null,
            }
          );

          // Rollback and return early
          if (originalEmergencyContactData) {
            get().updateEmergencyContactDataOptimistic(
              patientId,
              originalEmergencyContactData
            );
            set(state => ({
              ...state,
              patientCache: {
                ...state.patientCache,
                [patientId]: {
                  ...state.patientCache[patientId],
                  isStale: true,
                },
              },
              errors: {
                ...state.errors,
                [`${patientId}:emergency-contact`]:
                  'Failed to save emergency contact data',
              },
              isSaving: false,
            }));
          }
          return false;
        }

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorDetails = {
          component: 'patientStore',
          patientId,
          errorMessage,
          errorStack: error instanceof Error ? error.stack : null,
          payload: payloadForErrorLogging,
          rawError: error,
        };

        logger.error(
          `Failed to save emergency contact data: ${errorMessage}`,
          error instanceof Error ? error : new Error(errorMessage),
          errorDetails
        );

        // Rollback optimistic update
        if (originalEmergencyContactData) {
          get().updateEmergencyContactDataOptimistic(
            patientId,
            originalEmergencyContactData
          );
          set(state => ({
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...state.patientCache[patientId],
                isStale: true,
              },
            },
          }));
        }

        set(state => ({
          ...state,
          errors: {
            ...state.errors,
            [`${patientId}:emergency-contact`]:
              (error as Error).message ||
              'Failed to save emergency contact data',
          },
          isSaving: false,
        }));

        return false;
      }
    },

    saveMedicationsData: async (
      patientId: string | 'main',
      data: MedicationData[]
    ) => {
      set(state => {
        const newErrors = { ...state.errors };
        delete newErrors[`${patientId}:medications`];
        return {
          ...state,
          errors: newErrors,
          isSaving: true,
        };
      });

      // Store original data for rollback
      const originalMedicationsData = get().getMedicationsData(patientId);

      // Apply optimistic update
      get().updateMedicationsDataOptimistic(patientId, {
        currentMedications: data,
        activeMedicationsCount: data.filter(med => med.status === 'current')
          .length,
        lastUpdated: new Date().toISOString(),
      });

      try {
        // Mark cache as fresh after successful save
        set(state => ({
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...state.patientCache[patientId],
              lastFetched: Date.now(),
              isStale: false,
            },
          },
          isSaving: false,
        }));

        logger.info('Medications data saved successfully', {
          component: 'patientStore',
          patientId,
          medicationsCount: data.length,
        });

        return true;
      } catch (error) {
        logger.error('Failed to save medications data:', error as Error, {
          component: 'patientStore',
          patientId,
        });

        // Rollback optimistic update
        if (originalMedicationsData) {
          get().updateMedicationsDataOptimistic(
            patientId,
            originalMedicationsData
          );
          set(state => ({
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...state.patientCache[patientId],
                isStale: true,
              },
            },
          }));
        }

        set(state => ({
          ...state,
          errors: {
            ...state.errors,
            [`${patientId}:medications`]:
              (error as Error).message || 'Failed to save medications data',
          },
          isSaving: false,
        }));

        return false;
      }
    },

    saveMedicalHistoryData: async (
      patientId: string | 'main',
      data: MedicalVisitData[]
    ) => {
      set(state => {
        const newErrors = { ...state.errors };
        delete newErrors[`${patientId}:medical-history`];
        return {
          ...state,
          errors: newErrors,
          isSaving: true,
        };
      });

      // Store original data for rollback
      const originalMedicalHistoryData = get().getMedicalHistoryData(patientId);

      // Apply optimistic update
      get().updateMedicalHistoryDataOptimistic(patientId, {
        pastVisits: data,
        totalVisitsCount: data.length,
        lastUpdated: new Date().toISOString(),
      });

      try {
        // Mark cache as fresh after successful save
        set(state => ({
          ...state,
          patientCache: {
            ...state.patientCache,
            [patientId]: {
              ...state.patientCache[patientId],
              lastFetched: Date.now(),
              isStale: false,
            },
          },
          isSaving: false,
        }));

        logger.info('Medical history data saved successfully', {
          component: 'patientStore',
          patientId,
          visitsCount: data.length,
        });

        return true;
      } catch (error) {
        logger.error('Failed to save medical history data:', error as Error, {
          component: 'patientStore',
          patientId,
        });

        // Rollback optimistic update
        if (originalMedicalHistoryData) {
          get().updateMedicalHistoryDataOptimistic(
            patientId,
            originalMedicalHistoryData
          );
          set(state => ({
            ...state,
            patientCache: {
              ...state.patientCache,
              [patientId]: {
                ...state.patientCache[patientId],
                isStale: true,
              },
            },
          }));
        }

        set(state => ({
          ...state,
          errors: {
            ...state.errors,
            [`${patientId}:medical-history`]:
              (error as Error).message || 'Failed to save medical history data',
          },
          isSaving: false,
        }));

        return false;
      }
    },

    clearCache: (patientId?: string | 'main') => {
      set(state => {
        if (patientId) {
          const newCache = { ...state.patientCache };
          delete newCache[patientId];
          return { ...state, patientCache: newCache };
        } else {
          return { ...state, patientCache: {} };
        }
      });
    },

    getError: (patientId: string | 'main') => {
      return get().errors[patientId] || null;
    },

    setError: (patientId: string | 'main', error: string | null) => {
      set(state => ({
        ...state,
        errors: { ...state.errors, [patientId]: error },
      }));
    },

    clearError: (patientId: string | 'main') => {
      set(state => {
        const newErrors = { ...state.errors };
        delete newErrors[patientId];
        return { ...state, errors: newErrors };
      });
    },
  }))
);
