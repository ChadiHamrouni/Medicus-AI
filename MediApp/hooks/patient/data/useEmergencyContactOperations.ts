import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDependents } from '@/contexts/DependentsContext';
import {
  usePatientStore,
  type EmergencyContactData,
} from '@/stores/patientStore';
import { useQueryClient } from '@tanstack/react-query';
import { PATIENT_PROFILE_QUERY_KEYS } from '../queries/usePatientProfileQueries';

export const useEmergencyContactOperations = () => {
  const { refreshDependents } = useDependents();
  const { saveEmergencyContactData, isSaving, error } = usePatientStore();
  const queryClient = useQueryClient();

  const handleSaveEmergencyContact = useCallback(
    async (
      emergencyContactData: EmergencyContactData,
      _currentPatient: any,
      selectedDependent: any,
      _isDependentContext: boolean
    ) => {
      // Generate patient ID for store operations
      const patientId =
        selectedDependent === 'main' ? 'main' : String(selectedDependent);

      // Use Zustand store to save with optimistic updates
      const success = await saveEmergencyContactData(
        patientId,
        emergencyContactData
      );

      if (success) {
        // Invalidate the patient profile query to fetch fresh data
        if (patientId === 'main') {
          await queryClient.invalidateQueries({
            queryKey: PATIENT_PROFILE_QUERY_KEYS.profile(),
          });
        }

        // Refresh dependents data after successful update
        await refreshDependents();

        // Detect secondary contact from the emergency_contact array
        const hasSecondaryContact =
          emergencyContactData.emergency_contact.length > 1;
        const contactsText = hasSecondaryContact
          ? 'Emergency contacts'
          : 'Emergency contact';
        Alert.alert('Success', `${contactsText} updated successfully!`);
      } else {
        const errorMessage =
          error ||
          'Failed to update emergency contact information. Please try again.';
        Alert.alert('Error', errorMessage);
      }

      return success;
    },
    [saveEmergencyContactData, refreshDependents, error, queryClient]
  );

  const handleSaveSecondaryContact = useCallback(
    async (
      emergencyContactData: EmergencyContactData,
      currentPatient: any,
      selectedDependent: any,
      isDependentContext: boolean
    ) => {
      // Secondary contact is now handled by the main save function
      return await handleSaveEmergencyContact(
        emergencyContactData,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
    },
    [handleSaveEmergencyContact]
  );

  // Backward compatibility aliases
  const handleSavePrimaryContact = handleSaveEmergencyContact;

  return {
    handleSaveEmergencyContact,
    handleSavePrimaryContact, // Backward compatibility
    handleSaveSecondaryContact,
    isSaving,
  };
};
