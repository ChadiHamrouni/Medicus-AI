import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { usePatientView } from '@/contexts/PatientViewContext';
import { type ContactData } from '@/stores/patientStore';
import { usePatientProfileQuery, usePatientByIdQuery } from '../queries/usePatientProfileQueries';

export const useContactData = () => {
  const { authState } = useAuthContext();
  const { selectedDependent } = useDependents();
  const { patientId: contextPatientId, isViewingAsDoctor } = usePatientView();

  // Determine if we're in dependent context (not 'main')
  const isDependentContext = selectedDependent !== 'main';

  // Use patient by ID query when viewing as doctor from MediDoc
  const {
    data: doctorViewPatient,
    isLoading: isDoctorViewLoading,
    error: doctorViewError,
    refetch: doctorViewRefetch,
  } = usePatientByIdQuery(contextPatientId || 0, isViewingAsDoctor && !!contextPatientId);

  // We only fetch for main patient when NOT viewing as doctor
  const {
    data: patientProfile,
    isLoading: isMainLoading,
    error: mainError,
    refetch: mainRefetch,
  } = usePatientProfileQuery(!isDependentContext && !isViewingAsDoctor, authState.user);

  // Select the appropriate data based on context
  const effectivePatient = isViewingAsDoctor ? doctorViewPatient : patientProfile;
  const isLoading = isViewingAsDoctor ? isDoctorViewLoading : isMainLoading;
  const error = isViewingAsDoctor ? doctorViewError : mainError;
  const refetch = isViewingAsDoctor ? doctorViewRefetch : mainRefetch;

  // Helper function to extract contact data from API response
  const mapProfileToContactData = (apiData: any): ContactData => {
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
      dateOfBirth: apiData?.dob || apiData?.date_of_birth || '',
      gender: apiData?.gender || '',
      address: streetAddress,
      city: addressData?.city || apiData?.city || '',
      state: addressData?.state || apiData?.state || '',
      zipCode: addressData?.zip_code || apiData?.zip_code || '',
      country_id: addressData?.country_id || apiData?.country_id,
      country_name: addressData?.country_name, // Denormalized country name for immediate display
    };
  };

  const contactData: ContactData = mapProfileToContactData(
    effectivePatient || {}
  );

  // Check if phone is verified (only for main patient, not when viewing as doctor)
  const isPhoneVerified = !isDependentContext && !isViewingAsDoctor
    ? !!authState?.user?.is_phone_verified
    : false;

  return {
    contactData,
    isPhoneVerified,
    isDependentContext,
    isViewingAsDoctor,
    currentPatient: effectivePatient || null,
    selectedDependent,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
