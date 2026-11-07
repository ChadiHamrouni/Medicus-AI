import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { logger } from '@/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useDependentsQuery } from '@/hooks/patient/queries';
import { UserRole } from '@/types/auth';

// Types
export type UserDependent = 'main' | number;

export interface Dependent {
  id: number;
  name: string;
  relationship: string;
  age: number;
  gender?: string;
  // Full patient data from API - no longer strip these out
  first_name?: string;
  last_name?: string;
  full_name?: string;
  dob?: string;
  email?: string;
  phone_number?: string;
  wa_number?: string;
  country_id?: number;
  country_name?: string;
  language_id?: number;
  language_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Context interface
interface DependentsContextType {
  selectedDependent: UserDependent;
  setSelectedDependent: (dependentId: UserDependent) => Promise<void>;
  getCurrentDependentName: () => string;
  getDependentById: (id: UserDependent) => Dependent | null;
  showDependentDropdown: boolean;
  setShowDependentDropdown: (show: boolean) => void;
  dependents: Dependent[];
  isLoading: boolean;
  hasDependents: boolean;
  refreshDependents: () => Promise<void>;
}

// Create context
const DependentsContext = createContext<DependentsContextType | undefined>(
  undefined
);

// Storage key
// const SELECTED_DEPENDENT_KEY = '@MediApp:selectedDependent'; // REMOVED: No persistence desired

// Helper function to calculate age from date of birth
const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

// Provider component
export const DependentsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { authState } = useAuthContext();
  const { userAssistant } = useAppContext();
  const [selectedDependent, setSelectedDependentState] =
    useState<UserDependent>('main');
  const [showDependentDropdown, setShowDependentDropdown] = useState(false);
  // const [isInitialized, setIsInitialized] = useState(false);
  const [dependents, setDependents] = useState<Dependent[]>([]);

  const {
    data: dependentsData,
    isLoading,
    refetch: refetchDependentsApi,
  } = useDependentsQuery(false, {
    enabled:
      authState.isAuthenticated &&
      !!authState.token &&
      (authState.user?.role === UserRole.PATIENT ||
        userAssistant === 'mediaid'),
    refetchOnWindowFocus: false,
  });

  // Transform dependents from API response
  const loadDependentsFromApi = () => {
    try {
      if (!dependentsData) {
        setDependents([]);
        return;
      }

      // Transform to match Dependent interface - PRESERVE ALL API DATA
      const transformedDependents: Dependent[] = dependentsData.dependents.map(
        dep => ({
          id: dep.id,
          name: dep.full_name || `${dep.first_name} ${dep.last_name}`.trim(),
          relationship:
            dep.relationship.charAt(0).toUpperCase() +
            dep.relationship.slice(1), // Capitalize
          age: dep.age,
          gender: dep.gender,
          // Preserve full patient data from API - no more mock nulls
          first_name: dep.first_name,
          last_name: dep.last_name,
          full_name: dep.full_name,
          dob: dep.dob,
          email: dep.email,
          phone_number: dep.phone_number,
          wa_number: dep.wa_number,
          country_id: dep.country_id,
          country_name: dep.country_name,
          language_id: dep.language_id,
          language_name: dep.language_name,
          created_at: dep.created_at,
          updated_at: dep.updated_at,
        })
      );

      setDependents(transformedDependents);
      logger.info('Dependents loaded from API', {
        component: 'DependentsContext',
        count: transformedDependents.length,
        total: dependentsData.total,
      });
    } catch (error) {
      logger.error('Failed to load dependents from API', error as Error, {
        component: 'DependentsContext',
      });
      // Set empty array on error to prevent crashes
      setDependents([]);
    }
  };

  // Refresh dependents wrapper (refetches from API)
  const refreshDependents = async () => {
    try {
      await refetchDependentsApi();
      logger.info('Dependents refreshed from API', {
        component: 'DependentsContext',
      });
    } catch (error) {
      logger.error('Failed to refresh dependents', error as Error, {
        component: 'DependentsContext',
      });
    }
  };

  useEffect(() => {
    loadDependentsFromApi();
  }, [dependentsData]);

  /*
  useEffect(() => {
    const loadPersistedDependent = async () => { ... }
    if (!isLoading) { loadPersistedDependent(); }
  }, [dependents, isLoading]);
  */

  // Clean up state on logout
  useEffect(() => {
    if (!authState.isAuthenticated) {
      logger.info('User logged out, clearing DependentsContext state', {
        component: 'DependentsContext',
      });
      setSelectedDependentState('main');
      setDependents([]);
      /*
      AsyncStorage.removeItem(SELECTED_DEPENDENT_KEY).catch(err => {
        logger.error(
          'Failed to clear selected dependent on logout cleanup',
          err as Error
        );
      });
      */
    }
  }, [authState.isAuthenticated]);

  // Set selected dependent without persistence
  const setSelectedDependent = async (dependentId: UserDependent) => {
    setSelectedDependentState(dependentId);

    // await AsyncStorage.setItem(SELECTED_DEPENDENT_KEY, dependentId.toString());

    logger.info('Dependent selection changed', {
      component: 'DependentsContext',
      selectedDependent: dependentId,
      dependentName: getCurrentDependentName(dependentId),
    });
  };

  // Get current dependent name
  const getCurrentDependentName = (dependentId?: UserDependent) => {
    const id = dependentId || selectedDependent;
    if (id === 'main') return 'Me';
    const dependent = dependents.find(dep => dep.id === id);
    return dependent?.name || 'Unknown';
  };

  // Get dependent by ID
  const getDependentById = (id: UserDependent): Dependent | null => {
    if (id === 'main') {
      return {
        id: 'main' as any, // Keep as string for main
        name: 'Me',
        relationship: 'Self',
        age: 0, // Not applicable
      };
    }
    return dependents.find(dep => dep.id === id) || null;
  };

  // Calculate computed values
  const hasDependents = dependents.length > 0;

  const contextValue: DependentsContextType = {
    selectedDependent,
    setSelectedDependent,
    getCurrentDependentName,
    getDependentById,
    showDependentDropdown,
    setShowDependentDropdown,
    dependents,
    isLoading,
    hasDependents,
    refreshDependents,
  };

  // Don't render children until we've loaded the persisted state
  // if (!isInitialized) {
  //   return null; // Or a loading spinner
  // }

  return (
    <DependentsContext.Provider value={contextValue}>
      {children}
    </DependentsContext.Provider>
  );
};

// Hook to use the context
export const useDependents = () => {
  const context = useContext(DependentsContext);
  if (context === undefined) {
    throw new Error('useDependents must be used within a DependentsProvider');
  }
  return context;
};

// Export the context for direct access if needed
export default DependentsContext;
