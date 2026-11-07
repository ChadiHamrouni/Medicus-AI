import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { usePatientView } from '@/contexts/PatientViewContext';
import {
  type EmergencyContactData,
  type EmergencyContactItem,
} from '@/stores/patientStore';
import { usePatientProfileQuery, usePatientByIdQuery } from '../queries/usePatientProfileQueries';

export const useEmergencyContactData = () => {
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

  // Helper function to extract emergency contact data from API response
  const mapProfileToEmergencyContactData = (
    apiData: any
  ): EmergencyContactData => {
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

    // Legacy object shapes
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

  const emergencyContactData: EmergencyContactData =
    mapProfileToEmergencyContactData(effectivePatient || {});

  return {
    emergencyContactData,
    setEmergencyContactData: () => {
      console.warn(
        'setEmergencyContactData is deprecated in React Query migration'
      );
    },
    isLoading,
    isDependentContext,
    isViewingAsDoctor,
    currentPatient: effectivePatient || null,
    selectedDependent,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
