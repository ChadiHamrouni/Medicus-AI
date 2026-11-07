/**
 * ViewingDoctorContext
 *
 * Manages when a patient is viewing a doctor's profile from a conversation.
 * This is the mirror of PatientViewContext (doctor viewing patient).
 *
 * Patient pages should use `useViewingDoctor()` to check if they're viewing
 * a doctor from a conversation context.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Doctor demographics for display when viewing from conversation.
 */
interface DoctorDemographics {
  name: string | null;
  specialty: string | null;
}

interface ViewingDoctorState {
  // The doctor ID being viewed
  doctorId: number | null;
  // Whether we're viewing from a conversation (patient viewing doctor)
  isViewingFromConversation: boolean;
  // Conversation ID to return to
  returnConvoId: string | null;
  // Doctor demographics (for display)
  doctorDemographics: DoctorDemographics | null;
}

interface SetViewingDoctorParams {
  doctorId: number;
  convoId: string;
  doctorName?: string;
  doctorSpecialty?: string;
}

interface ViewingDoctorContextType extends ViewingDoctorState {
  // Set the doctor to view (called when patient clicks on doctor in conversation)
  setViewingDoctor: (params: SetViewingDoctorParams) => void;
  // Clear the viewing state
  clearViewingDoctor: () => void;
}

const ViewingDoctorContext = createContext<ViewingDoctorContextType | null>(null);

export const ViewingDoctorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overrideDoctorId, setOverrideDoctorId] = useState<number | null>(null);
  const [returnConvoId, setReturnConvoId] = useState<string | null>(null);
  const [overrideDemographics, setOverrideDemographics] = useState<DoctorDemographics | null>(null);

  const doctorId = overrideDoctorId;
  const isViewingFromConversation = overrideDoctorId !== null;

  const setViewingDoctor = useCallback((params: SetViewingDoctorParams) => {
    const { doctorId, convoId, doctorName, doctorSpecialty } = params;
    setOverrideDoctorId(doctorId);
    setReturnConvoId(convoId);
    setOverrideDemographics({
      name: doctorName || null,
      specialty: doctorSpecialty || null,
    });
  }, []);

  const clearViewingDoctor = useCallback(() => {
    setOverrideDoctorId(null);
    setReturnConvoId(null);
    setOverrideDemographics(null);
  }, []);

  const value: ViewingDoctorContextType = {
    doctorId,
    isViewingFromConversation,
    returnConvoId,
    doctorDemographics: isViewingFromConversation ? overrideDemographics : null,
    setViewingDoctor,
    clearViewingDoctor,
  };

  return (
    <ViewingDoctorContext.Provider value={value}>
      {children}
    </ViewingDoctorContext.Provider>
  );
};

export const useViewingDoctor = (): ViewingDoctorContextType => {
  const context = useContext(ViewingDoctorContext);
  if (!context) {
    throw new Error('useViewingDoctor must be used within a ViewingDoctorProvider');
  }
  return context;
};