import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { logger } from '@/utils';

// Core context variables as per BRD
export type UserRole = 'doctor' | 'patient';
export type UserAssistant = 'medidoc' | 'mediaid';
export type UserDependent = 'main' | string;

// Dependent interface
export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  age: number;
}

// Real dependents data - will be loaded from API
export const REAL_DEPENDENTS: Dependent[] = [];

// Context interface
interface AppContextType {
  // Core context variables
  userRole: UserRole;
  userAssistant: UserAssistant;
  userDependent: UserDependent;

  // Session IDs (mutually exclusive based on user_assistant)
  doctorId: string | null;
  patientId: string | null;
  activeId: string | null; // The currently active ID based on user_assistant

  // Has dependents flag
  hasDependents: boolean;

  // Actions
  setUserRole: (role: UserRole) => Promise<void>;
  setUserAssistant: (assistant: UserAssistant) => Promise<void>;
  setUserDependent: (dependent: UserDependent) => Promise<void>;
  setSessionIds: (
    doctorId: string | null,
    patientId: string | null
  ) => Promise<void>;

  // Helper functions
  getCurrentDependentName: () => string;
  getDependentById: (id: UserDependent) => Dependent | null;
  shouldShowDependentDropdown: () => boolean;

  // Session management
  clearSession: () => Promise<void>;

  // UI state
  showDependentDropdown: boolean;
  setShowDependentDropdown: (show: boolean) => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage keys
const USER_ROLE_KEY = '@MediApp:userRole';
const USER_ASSISTANT_KEY = '@MediApp:userAssistant';
const USER_DEPENDENT_KEY = '@MediApp:userDependent';
const DOCTOR_ID_KEY = '@MediApp:doctorId';
const PATIENT_ID_KEY = '@MediApp:patientId';

// Provider component
export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Core state - 99% of users are patients, so default to patient
  const [userRole, setUserRoleState] = useState<UserRole>('patient');
  const [userAssistant, setUserAssistantState] =
    useState<UserAssistant>('mediaid');
  const [userDependent, setUserDependentState] =
    useState<UserDependent>('main');

  // Session IDs state
  const [doctorId, setDoctorIdState] = useState<string | null>(null);
  const [patientId, setPatientIdState] = useState<string | null>(null);

  // UI state
  const [showDependentDropdown, setShowDependentDropdown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Has dependents flag - will be determined by actual API data
  const hasDependents = REAL_DEPENDENTS.length > 0;

  // Register the global setUserRole function for auth sync
  useEffect(() => {
    globalSetUserRole = setUserRole;
    return () => {
      globalSetUserRole = null;
    };
  }, []);

  // Load persisted state on app start
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const [
          savedRole,
          savedAssistant,
          savedDependent,
          savedDoctorId,
          savedPatientId,
        ] = await Promise.all([
          AsyncStorage.getItem(USER_ROLE_KEY),
          AsyncStorage.getItem(USER_ASSISTANT_KEY),
          AsyncStorage.getItem(USER_DEPENDENT_KEY),
          AsyncStorage.getItem(DOCTOR_ID_KEY),
          AsyncStorage.getItem(PATIENT_ID_KEY),
        ]);

        if (savedRole) {
          setUserRoleState(savedRole as UserRole);
        }

        if (savedAssistant) {
          setUserAssistantState(savedAssistant as UserAssistant);
        }

        if (savedDependent) {
          setUserDependentState(savedDependent as UserDependent);
        }

        if (savedDoctorId) {
          setDoctorIdState(savedDoctorId);
        }

        if (savedPatientId) {
          setPatientIdState(savedPatientId);
        }

        logger.info('Loaded persisted app state', {
          component: 'AppContext',
          userRole: savedRole || userRole,
          userAssistant: savedAssistant || userAssistant,
          userDependent: savedDependent || userDependent,
          doctorId: savedDoctorId,
          patientId: savedPatientId,
        });
      } catch (error) {
        logger.error('Failed to load persisted app state', error as Error, {
          component: 'AppContext',
        });
      } finally {
        setIsInitialized(true);
      }
    };

    loadPersistedState();
  }, []);

  // Set user role with persistence
  const setUserRole = async (role: UserRole) => {
    try {
      setUserRoleState(role);
      await AsyncStorage.setItem(USER_ROLE_KEY, role);

      // When role changes, reset assistant to default for that role
      const defaultAssistant: UserAssistant =
        role === 'doctor' ? 'medidoc' : 'mediaid';
      await setUserAssistant(defaultAssistant);

      logger.info('User role changed', {
        component: 'AppContext',
        userRole: role,
        userAssistant: defaultAssistant,
      });
    } catch (error) {
      logger.error('Failed to persist user role', error as Error, {
        component: 'AppContext',
        role,
      });
      setUserRoleState(role);
    }
  };

  // Set user assistant with persistence
  const setUserAssistant = async (assistant: UserAssistant) => {
    try {
      setUserAssistantState(assistant);
      await AsyncStorage.setItem(USER_ASSISTANT_KEY, assistant);

      // When switching to mediaid, reset to main patient if they have dependents
      if (assistant === 'mediaid' && hasDependents) {
        await setUserDependent('main');
      }

      logger.info('User assistant changed', {
        component: 'AppContext',
        userAssistant: assistant,
        userDependent: assistant === 'mediaid' ? userDependent : 'N/A',
      });
    } catch (error) {
      logger.error('Failed to persist user assistant', error as Error, {
        component: 'AppContext',
        assistant,
      });
      setUserAssistantState(assistant);
    }
  };

  // Set user dependent with persistence
  const setUserDependent = async (dependent: UserDependent) => {
    try {
      setUserDependentState(dependent);
      await AsyncStorage.setItem(USER_DEPENDENT_KEY, dependent);

      logger.info('User dependent changed', {
        component: 'AppContext',
        userDependent: dependent,
        dependentName: getCurrentDependentName(dependent),
      });
    } catch (error) {
      logger.error('Failed to persist user dependent', error as Error, {
        component: 'AppContext',
        dependent,
      });
      setUserDependentState(dependent);
    }
  };

  // Get current dependent name
  const getCurrentDependentName = (dependentId?: UserDependent) => {
    const id = dependentId || userDependent;
    if (id === 'main') return 'Me';
    const dependent = REAL_DEPENDENTS.find(dep => dep.id === id);
    return dependent?.name || 'Me';
  };

  // Get dependent by ID
  const getDependentById = (id: UserDependent): Dependent | null => {
    if (id === 'main') {
      return {
        id: 'main',
        name: 'Me',
        relationship: 'Self',
        age: 0, // Not applicable
      };
    }
    return REAL_DEPENDENTS.find(dep => dep.id === id) || null;
  };

  // Check if dependent dropdown should be shown (BRD rule)
  const shouldShowDependentDropdown = () => {
    return userAssistant === 'mediaid' && hasDependents;
  };

  // Set session IDs with persistence (BRD: Initialize on login)
  const setSessionIds = async (
    newDoctorId: string | null,
    newPatientId: string | null
  ) => {
    try {
      setDoctorIdState(newDoctorId);
      setPatientIdState(newPatientId);

      // Persist to AsyncStorage
      if (newDoctorId) {
        await AsyncStorage.setItem(DOCTOR_ID_KEY, newDoctorId);
      } else {
        await AsyncStorage.removeItem(DOCTOR_ID_KEY);
      }

      if (newPatientId) {
        await AsyncStorage.setItem(PATIENT_ID_KEY, newPatientId);
      } else {
        await AsyncStorage.removeItem(PATIENT_ID_KEY);
      }

      logger.info('Session IDs updated', {
        component: 'AppContext',
        doctorId: newDoctorId,
        patientId: newPatientId,
      });
    } catch (error) {
      logger.error('Failed to persist session IDs', error as Error, {
        component: 'AppContext',
        doctorId: newDoctorId,
        patientId: newPatientId,
      });
      // Update state even if persistence fails
      setDoctorIdState(newDoctorId);
      setPatientIdState(newPatientId);
    }
  };

  // Clear session (BRD: On logout)
  const clearSession = async () => {
    try {
      // setUserRoleState('patient');
      // setUserAssistantState('mediaid');
      // setUserDependentState('main');

      setDoctorIdState(null);
      setPatientIdState(null);
      setShowDependentDropdown(false);

      // Clear AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(USER_ROLE_KEY),
        AsyncStorage.removeItem(USER_ASSISTANT_KEY),
        AsyncStorage.removeItem(USER_DEPENDENT_KEY),
        AsyncStorage.removeItem(DOCTOR_ID_KEY),
        AsyncStorage.removeItem(PATIENT_ID_KEY),
      ]);

      logger.info('Session cleared', {
        component: 'AppContext',
      });
    } catch (error) {
      logger.error('Failed to clear session', error as Error, {
        component: 'AppContext',
      });
    }
  };

  // Compute active ID based on user_assistant (BRD: Mutually exclusive logic)
  const activeId = userAssistant === 'medidoc' ? doctorId : patientId;

  const contextValue: AppContextType = {
    // Core context variables
    userRole,
    userAssistant,
    userDependent,
    hasDependents,

    // Session IDs
    doctorId,
    patientId,
    activeId,

    // Actions
    setUserRole,
    setUserAssistant,
    setUserDependent,
    setSessionIds,

    // Helper functions
    getCurrentDependentName,
    getDependentById,
    shouldShowDependentDropdown,

    // Session management
    clearSession,

    // UI state
    showDependentDropdown,
    setShowDependentDropdown,
  };

  // Don't render children until we've loaded the persisted state
  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

// Global sync function to be called from authentication mutations
let globalSetUserRole: ((role: UserRole) => Promise<void>) | null = null;

// Function to sync user role from authentication
export const syncUserRoleFromAuth = async (
  apiRole: 'doctor' | 'patient'
): Promise<void> => {
  if (globalSetUserRole) {
    logger.info('Syncing user role from authentication', {
      component: 'AppContext',
      apiRole,
    });

    await globalSetUserRole(apiRole);
  } else {
    logger.warn('Global setUserRole not available for sync', {
      component: 'AppContext',
      apiRole,
    });
  }
};

export default AppContext;
