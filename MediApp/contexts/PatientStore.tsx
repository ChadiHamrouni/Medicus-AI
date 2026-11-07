/**
 * Patient Store
 * Manages patient state globally with server-side sync using Zustand
 * Handles current patient selection, dependents management, and persistence
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils';
import type {
  DependentResponse,
  CreateDependentRequest,
  UpdateDependentRequest,
  DependentListResponse,
} from '@/types';

// Use DependentResponse as PatientData for consistency
export type PatientData = DependentResponse;

interface PatientState {
  // Current patient selection
  currentPatient: PatientData | null;
  isDependentContext: boolean;

  // All available patients data
  availablePatients: PatientData[];
  mainPatient: PatientData | null;
  dependents: PatientData[];

  // Metadata
  summary: DependentListResponse['summary'] | null;
  total: number;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // State flags
  hasInitialized: boolean;
  lastSyncTime: Date | null;
  lastUpdateTime: Date | null;

  // Background sync timer
  backgroundSyncTimer: ReturnType<typeof setTimeout> | null;

  // Individual operation states
  isCreatingDependent: boolean;
  isUpdatingDependent: boolean;
  isDeletingDependent: boolean;
  isSwitchingContext: boolean;
}

interface PatientActions {
  // Initialization and cleanup
  initializeFromAuth: (_authData?: any) => void;
  initializeFromStorage: () => Promise<void>;
  clearPatients: () => void;

  // Data management
  setDependentsData: (_data: DependentListResponse) => void;
  refreshData: () => Promise<void>;

  // Patient switching
  switchPatient: (_patient: PatientData) => Promise<boolean>;
  switchToMainPatient: () => Promise<boolean>;

  // Dependent management
  addDependent: (
    _dependentData: CreateDependentRequest
  ) => Promise<PatientData>;
  updateDependent: (
    _patientId: number,
    _updateData: UpdateDependentRequest
  ) => Promise<PatientData>;
  deleteDependent: (_patientId: number) => Promise<boolean>;

  // Optimistic updates
  updateLocalPatient: (_updates: Partial<PatientData>) => void;
  addLocalDependent: (_dependent: PatientData) => void;
  removeLocalDependent: (_patientId: number) => void;

  // Background sync
  scheduleBackgroundSync: (_delayMs?: number) => void;
  saveCurrentState: () => void;

  // Error handling
  clearError: () => void;
  setError: (_error: string) => void;

  // Loading states
  setIsCreatingDependent: (_loading: boolean) => void;
  setIsUpdatingDependent: (_loading: boolean) => void;
  setIsDeletingDependent: (_loading: boolean) => void;
  setIsSwitchingContext: (_loading: boolean) => void;
}

type PatientStore = PatientState & PatientActions;

// const CURRENT_PATIENT_KEY = '@medicus_current_patient'; // REMOVED: No persistence desired

// Zustand store for patient management
export const usePatientStore = create<PatientStore>((set, get) => ({
  // Initial state
  currentPatient: null,
  isDependentContext: false,
  availablePatients: [],
  mainPatient: null,
  dependents: [],
  summary: null,
  total: 0,
  isLoading: false,
  error: null,
  hasInitialized: false,
  lastSyncTime: null,
  lastUpdateTime: null,
  backgroundSyncTimer: null,
  isCreatingDependent: false,
  isUpdatingDependent: false,
  isDeletingDependent: false,
  isSwitchingContext: false,

  // Initialize from auth context (if any patient data is provided)
  initializeFromAuth: (authData?: any) => {
    const state = get();

    if (authData && !state.hasInitialized) {
      logger.info('Initializing patient store from auth cache', {
        component: 'PatientStore',
        hasAuthData: !!authData,
      });

      // If auth provides patient data, use it
      set({
        hasInitialized: true,
        error: null,
      });
    }
  },

  // Initialize from AsyncStorage
  initializeFromStorage: async () => {
    /*
    try {
      const persistedPatient = await AsyncStorage.getItem(CURRENT_PATIENT_KEY);
      if (persistedPatient) {
        // ...
      }
    } catch (error) { ... }
    */
  },

  // Clear all patient data (on logout)
  clearPatients: () => {
    const state = get();
    if (state.backgroundSyncTimer) {
      clearTimeout(state.backgroundSyncTimer);
    }

    // Clear persisted data
    // AsyncStorage.removeItem(CURRENT_PATIENT_KEY).catch(err => ...);

    set({
      currentPatient: null,
      isDependentContext: false,
      availablePatients: [],
      mainPatient: null,
      dependents: [],
      summary: null,
      total: 0,
      isLoading: false,
      error: null,
      hasInitialized: false,
      lastSyncTime: null,
      lastUpdateTime: null,
      backgroundSyncTimer: null,
      isCreatingDependent: false,
      isUpdatingDependent: false,
      isDeletingDependent: false,
      isSwitchingContext: false,
    });
  },

  // Set dependents data from API
  setDependentsData: (data: DependentListResponse) => {
    const state = get();

    // Build available patients list
    const allPatients: PatientData[] = [];
    if (data.main_patient) {
      allPatients.push(data.main_patient);
    }
    allPatients.push(...data.dependents);

    // Deduplicate by id
    const seen = new Set<number>();
    const availablePatients = allPatients.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Auto-select main patient if none selected
    let currentPatient = state.currentPatient;

    // If not initialized or we want to force main on load
    if (!currentPatient || !state.hasInitialized) {
      currentPatient =
        data.main_patient ||
        availablePatients.find(p => p.relationship === 'self') ||
        availablePatients[0];
    }

    logger.info('Setting dependents data', {
      component: 'PatientStore',
      totalPatients: availablePatients.length,
      dependentsCount: data.dependents.length,
      hasMainPatient: !!data.main_patient,
      currentPatientId: currentPatient?.id,
    });

    set({
      availablePatients,
      mainPatient: data.main_patient || null,
      dependents: data.dependents,
      summary: data.summary,
      total: data.total,
      currentPatient,
      isDependentContext: currentPatient?.relationship !== 'main',
      lastSyncTime: new Date(),
      hasInitialized: true,
    });
  },

  // Refresh data (placeholder - will be connected to React Query)
  refreshData: async () => {
    logger.info('Refreshing patient data', {
      component: 'PatientStore',
    });
    // This will be implemented by connecting to React Query hooks
  },

  // Switch to a different patient
  switchPatient: async (patient: PatientData) => {
    const state = get();

    try {
      set({ isSwitchingContext: true, error: null });

      logger.info('Switching patient context', {
        component: 'PatientStore',
        fromPatientId: state.currentPatient?.id,
        toPatientId: patient.id,
        toPatientName: patient.full_name,
      });

      // Update context locally
      const isDependentContext = patient.relationship !== 'main';

      set({
        currentPatient: patient,
        isDependentContext,
        lastUpdateTime: new Date(),
      });

      // Persist the selection
      // await AsyncStorage.setItem(CURRENT_PATIENT_KEY, JSON.stringify(patient));

      logger.info('Patient context switched successfully', {
        component: 'PatientStore',
        activePatientId: patient.id,
        isDependent: isDependentContext,
      });

      get().scheduleBackgroundSync(5000); // Short delay for context switch
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to switch patient context';
      set({ error: errorMessage });

      logger.error('Failed to switch patient context', error, {
        component: 'PatientStore',
        patientId: patient.id,
      });

      return false;
    } finally {
      set({ isSwitchingContext: false });
    }
  },

  // Switch to main patient
  switchToMainPatient: async () => {
    const state = get();
    if (state.mainPatient) {
      return get().switchPatient(state.mainPatient);
    }
    return false;
  },

  // Add a new dependent (optimistic update pattern)
  addDependent: async (dependentData: CreateDependentRequest) => {
    set({ isCreatingDependent: true, error: null });

    try {
      logger.info('Creating new dependent', {
        component: 'PatientStore',
        dependentName: `${dependentData.first_name} ${dependentData.last_name}`,
        relationship: dependentData.relationship,
      });

      // This will be connected to the actual mutation
      // For now, create a mock response
      const newDependent: PatientData = {
        id: Date.now(), // Temporary ID
        user_id: 0, // Will be set by server
        first_name: dependentData.first_name,
        last_name: dependentData.last_name,
        full_name: `${dependentData.first_name} ${dependentData.last_name}`,
        relationship: dependentData.relationship,
        dob: dependentData.dob,
        age:
          new Date().getFullYear() - new Date(dependentData.dob).getFullYear(),
        gender: dependentData.gender,
        wa_number: dependentData.wa_number,
        emergency_contact: dependentData.emergency_contact,
        status: 'active',
        metadata: dependentData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        country_id: undefined,
        country_name: undefined,
      };

      // Add optimistically
      get().addLocalDependent(newDependent);

      logger.info('Dependent created successfully (optimistic)', {
        component: 'PatientStore',
        dependentId: newDependent.id,
        dependentName: newDependent.full_name,
      });

      return newDependent;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to add dependent';
      set({ error: errorMessage });

      logger.error('Failed to add dependent', error, {
        component: 'PatientStore',
      });

      throw error;
    } finally {
      set({ isCreatingDependent: false });
    }
  },

  // Update a dependent (optimistic update pattern)
  updateDependent: async (
    patientId: number,
    updateData: UpdateDependentRequest
  ) => {
    const state = get();
    set({ isUpdatingDependent: true, error: null });

    try {
      logger.info('Updating dependent', {
        component: 'PatientStore',
        patientId,
      });

      // Find the current patient data
      const currentPatient = state.availablePatients.find(
        p => p.id === patientId
      );
      if (!currentPatient) {
        throw new Error('Patient not found');
      }

      // Create updated patient data
      const updatedPatient: PatientData = {
        ...currentPatient,
        ...updateData,
        full_name:
          updateData.first_name && updateData.last_name
            ? `${updateData.first_name} ${updateData.last_name}`
            : currentPatient.full_name,
        updated_at: new Date().toISOString(),
      };

      // Update optimistically
      get().updateLocalPatient(updatedPatient);

      logger.info('Dependent updated successfully (optimistic)', {
        component: 'PatientStore',
        dependentId: updatedPatient.id,
        dependentName: updatedPatient.full_name,
      });

      return updatedPatient;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update dependent';
      set({ error: errorMessage });

      logger.error('Failed to update dependent', error, {
        component: 'PatientStore',
        patientId,
      });

      throw error;
    } finally {
      set({ isUpdatingDependent: false });
    }
  },

  // Delete a dependent
  deleteDependent: async (patientId: number) => {
    const state = get();
    set({ isDeletingDependent: true, error: null });

    try {
      logger.info('Deleting dependent', {
        component: 'PatientStore',
        patientId,
      });

      // Remove optimistically
      get().removeLocalDependent(patientId);

      // If we're currently viewing the deleted patient, switch to main
      if (state.currentPatient?.id === patientId && state.mainPatient) {
        await get().switchPatient(state.mainPatient);
      }

      logger.info('Dependent deleted successfully (optimistic)', {
        component: 'PatientStore',
        patientId,
      });

      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete dependent';
      set({ error: errorMessage });

      logger.error('Failed to delete dependent', error, {
        component: 'PatientStore',
        patientId,
      });

      throw error;
    } finally {
      set({ isDeletingDependent: false });
    }
  },

  // Optimistic local updates
  updateLocalPatient: (updates: Partial<PatientData>) => {
    const state = get();

    const updatedPatients = state.availablePatients.map(patient =>
      patient.id === updates.id ? { ...patient, ...updates } : patient
    );

    const updatedDependents = state.dependents.map(dependent =>
      dependent.id === updates.id ? { ...dependent, ...updates } : dependent
    );

    let updatedMainPatient = state.mainPatient;
    if (state.mainPatient && state.mainPatient.id === updates.id) {
      updatedMainPatient = { ...state.mainPatient, ...updates };
    }

    let updatedCurrentPatient = state.currentPatient;
    if (state.currentPatient && state.currentPatient.id === updates.id) {
      updatedCurrentPatient = { ...state.currentPatient, ...updates };
    }

    set({
      availablePatients: updatedPatients,
      dependents: updatedDependents,
      mainPatient: updatedMainPatient,
      currentPatient: updatedCurrentPatient,
      lastUpdateTime: new Date(),
    });

    get().scheduleBackgroundSync(30000);
  },

  addLocalDependent: (dependent: PatientData) => {
    const state = get();

    set({
      dependents: [...state.dependents, dependent],
      availablePatients: [...state.availablePatients, dependent],
      total: state.total + 1,
      lastUpdateTime: new Date(),
    });

    get().scheduleBackgroundSync(30000);
  },

  removeLocalDependent: (patientId: number) => {
    const state = get();

    set({
      dependents: state.dependents.filter(d => d.id !== patientId),
      availablePatients: state.availablePatients.filter(
        p => p.id !== patientId
      ),
      total: Math.max(0, state.total - 1),
      lastUpdateTime: new Date(),
    });

    get().scheduleBackgroundSync(30000);
  },

  // Background sync
  scheduleBackgroundSync: (delayMs: number = 30000) => {
    const state = get();

    if (state.backgroundSyncTimer) {
      clearTimeout(state.backgroundSyncTimer);
    }

    const timer = setTimeout(async () => {
      logger.info('Running scheduled background sync', {
        component: 'PatientStore',
        delayMs,
      });

      try {
        await get().refreshData();
      } catch (error) {
        logger.warn('Background sync failed', {
          component: 'PatientStore',
          error: error as Error,
        });
      }
    }, delayMs);

    set({ backgroundSyncTimer: timer });
  },

  saveCurrentState: () => {
    const state = get();

    set({
      lastUpdateTime: null,
      lastSyncTime: new Date(),
    });

    logger.info('Current patient state saved as baseline', {
      component: 'PatientStore',
      currentPatientId: state.currentPatient?.id,
    });
  },

  // Error handling
  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },

  // Loading state setters
  setIsCreatingDependent: (loading: boolean) => {
    set({ isCreatingDependent: loading });
  },

  setIsUpdatingDependent: (loading: boolean) => {
    set({ isUpdatingDependent: loading });
  },

  setIsDeletingDependent: (loading: boolean) => {
    set({ isDeletingDependent: loading });
  },

  setIsSwitchingContext: (loading: boolean) => {
    set({ isSwitchingContext: loading });
  },
}));

// Export the hook with the same name for compatibility
export const usePatientContextStore = usePatientStore;

// Default export for backward compatibility
export default usePatientStore;
