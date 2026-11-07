import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDependents } from '@/contexts/DependentsContext';
import { usePatientStore, type ContactData } from '@/stores/patientStore';
import { useQueryClient } from '@tanstack/react-query';
import { PATIENT_PROFILE_QUERY_KEYS } from '../queries/usePatientProfileQueries';

export const useContactFormOperations = () => {
  const { refreshDependents } = useDependents();
  const { saveContactData, isSaving } = usePatientStore();
  const queryClient = useQueryClient();

  const handleSavePersonal = useCallback(
    async (
      contactData: ContactData,
      _currentPatient: any,
      selectedDependent: any,
      _isDependentContext: boolean
    ) => {
      // Generate patient ID for store operations
      const patientId =
        selectedDependent === 'main' ? 'main' : String(selectedDependent);

      // Prepare the personal data updates
      const personalUpdates: Partial<ContactData> = {};

      if (contactData.firstName.trim())
        personalUpdates.firstName = contactData.firstName.trim();
      if (contactData.lastName.trim())
        personalUpdates.lastName = contactData.lastName.trim();
      if (contactData.dateOfBirth.trim())
        personalUpdates.dateOfBirth = contactData.dateOfBirth.trim();
      if (contactData.gender.trim())
        personalUpdates.gender = contactData.gender.trim();

      if (Object.keys(personalUpdates).length === 0) {
        Alert.alert('No Changes', 'No supported fields were modified.');
        return false;
      }

      // Use Zustand store to save with optimistic updates
      const success = await saveContactData(patientId, personalUpdates, false);

      if (success) {
        // Invalidate the patient profile query to fetch fresh data
        if (patientId === 'main') {
          await queryClient.invalidateQueries({
            queryKey: PATIENT_PROFILE_QUERY_KEYS.profile(),
          });
        }

        // Refresh dependents data after successful update
        await refreshDependents();
        Alert.alert('Success', 'Personal information updated successfully!');
      } else {
        Alert.alert(
          'Error',
          'Failed to update personal information. Please try again.'
        );
      }

      return success;
    },
    [saveContactData, refreshDependents, queryClient]
  );

  const handleSaveAddress = useCallback(
    async (
      contactData: ContactData,
      _currentPatient: any,
      selectedDependent: any,
      _isDependentContext: boolean
    ) => {
      // Generate patient ID for store operations
      const patientId =
        selectedDependent === 'main' ? 'main' : String(selectedDependent);

      // Prepare the address data updates
      const addressUpdates: Partial<ContactData> = {};

      if (contactData.address.trim())
        addressUpdates.address = contactData.address.trim();
      if (contactData.city.trim())
        addressUpdates.city = contactData.city.trim();
      if (contactData.state.trim())
        addressUpdates.state = contactData.state.trim();
      if (contactData.zipCode.trim())
        addressUpdates.zipCode = contactData.zipCode.trim();
      if (contactData.country_id !== undefined)
        addressUpdates.country_id = contactData.country_id;

      if (Object.keys(addressUpdates).length === 0) {
        Alert.alert('No Changes', 'No address fields were modified.');
        return false;
      }

      // Address updates are only supported for main patient
      if (selectedDependent !== 'main') {
        Alert.alert(
          'Not Supported',
          'Address management for dependents is not yet available.'
        );
        return false;
      }

      // Use Zustand store to save with optimistic updates
      const success = await saveContactData(patientId, addressUpdates, true);

      if (success) {
        // Invalidate the patient profile query to fetch fresh data
        await queryClient.invalidateQueries({
          queryKey: PATIENT_PROFILE_QUERY_KEYS.profile(),
        });

        // Refresh dependents data after successful update
        await refreshDependents();
        Alert.alert('Success', 'Address information updated successfully!');
      } else {
        Alert.alert(
          'Error',
          'Failed to update address information. Please try again.'
        );
      }

      return success;
    },
    [saveContactData, refreshDependents, queryClient]
  );

  return {
    handleSavePersonal,
    handleSaveAddress,
    isSaving,
  };
};
