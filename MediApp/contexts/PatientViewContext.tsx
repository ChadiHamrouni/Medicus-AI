/**
 * PatientViewContext
 *
 * Manages which patient is currently being viewed. This handles two scenarios:
 * 1. Patient viewing their own data (uses auth state)
 * 2. Doctor viewing a patient from MediDoc (uses override patient ID)
 *
 * All patient data hooks should use `usePatientView()` to get the current patient ID
 * instead of directly accessing auth state.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuthContext } from './AuthContext';
import { useDependents } from './DependentsContext';

/**
 * Patient demographics for display when viewing from MediDoc.
 * These come from the backend SessionContext via the navigation URL.
 */
interface PatientDemographics {
  name: string | null;
  age: number | null;
  gender: string | null;
}

interface PatientViewState {
  // The patient ID to use for data fetching
  patientId: number | null;
  // Whether we're viewing as a doctor (from MediDoc)
  isViewingAsDoctor: boolean;
  // Conversation ID to return to (if from MediDoc)
  returnConvoId: string | null;
  // Patient demographics (for display when viewing as doctor)
  patientDemographics: PatientDemographics | null;
}

interface SetViewingPatientParams {
  patientId: number;
  convoId: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
}

interface PatientViewContextType extends PatientViewState {
  // Set the patient to view (called when entering from MediDoc)
  setViewingPatient: (params: SetViewingPatientParams) => void;
  // Clear the override and return to normal viewing
  clearViewingPatient: () => void;
  // Legacy getter for backward compatibility
  patientName: string | null;
}

const PatientViewContext = createContext<PatientViewContextType | null>(null);

export const PatientViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuthContext();
  const { selectedDependent } = useDependents();

  // Override state for when doctor is viewing a patient
  const [overridePatientId, setOverridePatientId] = useState<number | null>(null);
  const [returnConvoId, setReturnConvoId] = useState<string | null>(null);
  const [overrideDemographics, setOverrideDemographics] = useState<PatientDemographics | null>(null);

  // Determine the actual patient ID to use
  const getEffectivePatientId = (): number | null => {
    // If we have an override (doctor viewing patient), use that
    if (overridePatientId !== null) {
      return overridePatientId;
    }

    // Otherwise use the normal auth-based logic
    if (selectedDependent === 'main') {
      return authState.patientProfile?.id || null;
    }

    return typeof selectedDependent === 'number' ? selectedDependent : null;
  };

  const patientId = getEffectivePatientId();
  const isViewingAsDoctor = overridePatientId !== null;

  const setViewingPatient = useCallback((params: SetViewingPatientParams) => {
    const { patientId, convoId, patientName, patientAge, patientGender } = params;
    setOverridePatientId(patientId);
    setReturnConvoId(convoId);
    setOverrideDemographics({
      name: patientName || null,
      age: patientAge ?? null,
      gender: patientGender || null,
    });
  }, []);

  const clearViewingPatient = useCallback(() => {
    setOverridePatientId(null);
    setReturnConvoId(null);
    setOverrideDemographics(null);
  }, []);

  const value: PatientViewContextType = {
    patientId,
    isViewingAsDoctor,
    returnConvoId,
    patientDemographics: isViewingAsDoctor ? overrideDemographics : null,
    // Legacy getter for backward compatibility
    patientName: isViewingAsDoctor ? overrideDemographics?.name || null : null,
    setViewingPatient,
    clearViewingPatient,
  };

  return (
    <PatientViewContext.Provider value={value}>
      {children}
    </PatientViewContext.Provider>
  );
};

export const usePatientView = (): PatientViewContextType => {
  const context = useContext(PatientViewContext);
  if (!context) {
    throw new Error('usePatientView must be used within a PatientViewProvider');
  }
  return context;
};

/**
 * Hook for getting just the patient ID - convenience wrapper
 */
export const useCurrentPatientId = (): number | null => {
  const { patientId } = usePatientView();
  return patientId;
};