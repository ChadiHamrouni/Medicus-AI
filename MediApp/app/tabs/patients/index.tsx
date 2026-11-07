import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { useDoctorView } from '@/contexts/DoctorViewContext';
import { usePatientView } from '@/contexts/PatientViewContext';
import { UserRole } from '@/types/auth';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, ScrollView, View } from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import {
  PatientProfileCard,
  PatientSectionGroup,
  PATIENT_SECTIONS,
} from '@/components/features/patient/profile';
import { calculateAge } from '@/utils/data';
import { ProfileCard, ProfileRow } from '@/components';
import { getPatientById } from '@/services/patient/profile';
import type { PatientProfileResponse } from '@/types';

// Patient data interface
interface PatientData {
  id: string | number;
  name: string;
  avatar: string;
  age: number | undefined;
  gender: string;
  relationship: string;
  isMainPatient: boolean;
  bloodType?: string;
  conditions?: string[];
  emergencyContact?: string;
  insurance?: string;
}

const PatientsTab: React.FC = () => {
  const { authState } = useAuthContext();
  const { viewingAsPatient, setViewingAsPatient } = useDoctorView();
  const router = useRouter();

  // URL params fallback for backward compatibility (e.g., direct links, older versions)
  const { from, convo_id, patient_id, patient_name, patient_age, patient_gender } = useLocalSearchParams();

  // Use PatientViewContext instead of URL params
  const { isViewingAsDoctor: isFromMediDoc, returnConvoId, patientDemographics, clearViewingPatient, setViewingPatient, patientId: contextPatientId } = usePatientView();

  // State for fetched patient profile (when viewing as doctor from MediDoc)
  const [fetchedPatientProfile, setFetchedPatientProfile] = useState<PatientProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fallback: If URL params are present but context is not set, initialize context from params
  useEffect(() => {
    if (from === 'medidoc' && patient_id && !isFromMediDoc) {
      const patientIdNum = Number(patient_id);
      if (patientIdNum) {
        setViewingPatient({
          patientId: patientIdNum,
          convoId: (convo_id as string) || '',
          patientName: (patient_name as string) || undefined,
          patientAge: patient_age ? Number(patient_age) : undefined,
          patientGender: (patient_gender as string) || undefined,
        });
      }
    }
  }, [from, patient_id, convo_id, patient_name, patient_age, patient_gender, isFromMediDoc, setViewingPatient]);

  // Fetch patient profile when viewing from MediDoc to get complete demographics (age, gender)
  useEffect(() => {
    const fetchPatientProfile = async () => {
      if (!isFromMediDoc || !contextPatientId) {
        setFetchedPatientProfile(null);
        return;
      }

      try {
        setIsLoadingProfile(true);
        const profile = await getPatientById(contextPatientId);
        setFetchedPatientProfile(profile);
      } catch (error) {
        console.error('[PatientsTab] Error fetching patient profile:', error);
        setFetchedPatientProfile(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchPatientProfile();
  }, [isFromMediDoc, contextPatientId]);

  // Use shared dependents context for backward compatibility (UI state management)
  const { selectedDependent: userDependent, dependents: contextDependents } =
    useDependents();

  const patientProfile = authState?.patientProfile;

  const dependents = contextDependents;

  // For development: assume PATIENT role if no user is set
  const isDoctor = authState.user?.role === UserRole.DOCTOR;
  // For patient page, isViewingAsDoctor means doctor is NOT viewing as patient
  const isViewingAsDoctor = isDoctor && !viewingAsPatient;

  // Generate current patient data based on selected dependent or MediDoc patient
  const getCurrentPatientData = (): PatientData => {
    // If viewing as doctor from MediDoc
    if (isFromMediDoc) {
      // Safe fallback: Context lost (e.g., app refresh while on patient page)
      if (!contextPatientId && !isLoadingProfile) {
        return {
          id: 'error',
          name: 'Patient Not Found',
          avatar: '',
          age: undefined,
          gender: '',
          relationship: '',
          isMainPatient: false,
          bloodType: undefined,
          conditions: [],
          emergencyContact: undefined,
          insurance: undefined,
        };
      }

      // Primary: Use context demographics (pre-fetched in chat screen with age/gender)
      if (patientDemographics && patientDemographics.name) {
        return {
          id: 'medidoc-patient',
          name: patientDemographics.name,
          avatar: '',
          age: patientDemographics.age ?? undefined,
          gender: patientDemographics.gender || '',
          relationship: 'Patient',
          isMainPatient: true,
          bloodType: undefined,
          conditions: [],
          emergencyContact: undefined,
          insurance: undefined,
        };
      }

      // Fallback: Use fetched profile if context incomplete (e.g., direct URL navigation)
      if (fetchedPatientProfile) {
        const profileName = fetchedPatientProfile.display_name ||
          fetchedPatientProfile.full_name ||
          `${fetchedPatientProfile.first_name || ''} ${fetchedPatientProfile.last_name || ''}`.trim() ||
          'Patient';

        const profileAge = fetchedPatientProfile.age ??
          calculateAge(fetchedPatientProfile.date_of_birth || fetchedPatientProfile.dob);

        return {
          id: 'medidoc-patient',
          name: profileName,
          avatar: '',
          age: profileAge,
          gender: fetchedPatientProfile.gender || '',
          relationship: 'Patient',
          isMainPatient: true,
          bloodType: undefined,
          conditions: fetchedPatientProfile.medical_conditions || [],
          emergencyContact: undefined,
          insurance: undefined,
        };
      }

      // Loading state
      return {
        id: 'medidoc-patient',
        name: 'Loading...',
        avatar: '',
        age: undefined,
        gender: '',
        relationship: 'Patient',
        isMainPatient: true,
        bloodType: undefined,
        conditions: [],
        emergencyContact: undefined,
        insurance: undefined,
      };
    }

    if (userDependent === 'main') {
      const displayName =
        patientProfile?.full_name ||
        (patientProfile?.first_name || patientProfile?.last_name
          ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
          : authState?.user?.email || 'User');

      return {
        id: 'main',
        name: displayName,
        avatar: authState?.user?.avatar || '',
        age: calculateAge(patientProfile?.date_of_birth || patientProfile?.dob),
        gender: patientProfile?.gender || 'Unknown',
        relationship: 'Self',
        isMainPatient: true,
        bloodType: 'Unknown',
        conditions: [],
        emergencyContact: 'Not set',
        insurance: 'Not set',
      };
    } else {
      // Return dependent data from fetched dependents
      const dependent = dependents.find(dep => dep.id === userDependent);
      if (!dependent) {
        // Fallback if dependent not found - use main patient logic
        console.warn(
          'Dependent not found:',
          userDependent,
          'Available:',
          dependents,
          'Falling back to main patient'
        );

        const displayName =
          patientProfile?.full_name ||
          (patientProfile?.first_name || patientProfile?.last_name
            ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
            : authState?.user?.email || 'User');

        return {
          id: 'main',
          name: displayName,
          avatar: authState?.user?.avatar || '',
          age: calculateAge(
            patientProfile?.date_of_birth || patientProfile?.dob
          ),
          gender: patientProfile?.gender || 'Unknown',
          relationship: 'Self',
          isMainPatient: true,
          bloodType: 'Unknown',
          conditions: [],
          emergencyContact: 'Not set',
          insurance: 'Not set',
        };
      }

      return {
        id: dependent.id,
        name: dependent.name,
        avatar: '',
        age: dependent.age,
        gender: dependent.gender || 'Unknown',
        relationship: dependent.relationship,
        isMainPatient: false,
        bloodType: 'Unknown',
        conditions: [],
        emergencyContact:
          authState?.user?.display_name || authState?.user?.full_name
            ? `${authState?.user?.display_name || authState?.user?.full_name} (Guardian)`
            : authState?.user?.first_name || authState?.user?.last_name
              ? `${authState.user.first_name || ''} ${authState.user.last_name || ''} (Guardian)`.trim()
              : 'Guardian',
        insurance: 'Family Plan',
      };
    }
  };

  const currentPatient = getCurrentPatientData();

  const handleToggleViewMode = useCallback(() => {
    // Toggle the viewingAsPatient state in the context
    setViewingAsPatient(!viewingAsPatient);
  }, [viewingAsPatient, setViewingAsPatient]);

  // Handle exit back to conversation - uses replace to avoid tab history issues
  const handleExitToConversation = useCallback(() => {
    if (returnConvoId) {
      // Use replace to avoid stacking navigation history
      router.replace({
        pathname: '/tabs/chats/[id]',
        params: { id: returnConvoId },
      } as any);
    } else {
      router.replace('/tabs/chats' as any);
    }
  }, [returnConvoId, router]);

  // Get navigation object for event listeners
  const navigation = useNavigation();
  const isNavigatingRef = useRef(false);

  // Intercept ALL back navigation (works on both iOS and Android)
  // This catches: hardware back, swipe gestures, and programmatic navigation
  useEffect(() => {
    if (!isFromMediDoc) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent infinite loop - if we're already navigating, let it through
      if (isNavigatingRef.current) return;

      // Prevent default back behavior
      e.preventDefault();

      // Set flag to prevent re-entry
      isNavigatingRef.current = true;

      // Navigate to conversation instead
      handleExitToConversation();
    });

    return unsubscribe;
  }, [isFromMediDoc, navigation, handleExitToConversation]);

  // Handle hardware back button when viewing from MediDoc (Android)
  useEffect(() => {
    if (!isFromMediDoc) return;

    const onBackPress = () => {
      handleExitToConversation();
      return true; // Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [isFromMediDoc, handleExitToConversation]);

  // Clean up patient view context when component unmounts
  // This ensures data exists until the screen is actually destroyed
  useEffect(() => {
    return () => {
      if (isFromMediDoc) {
        clearViewingPatient();
      }
    };
  }, [isFromMediDoc, clearViewingPatient]);

  return (
    <StandardScreenLayout
      title="Patient Profile"
      showBackButton={false}
      noScroll
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Current Patient Card */}
        <PatientProfileCard
          name={currentPatient.name}
          avatar={currentPatient.avatar}
          isMainPatient={currentPatient.isMainPatient}
          relationship={currentPatient.relationship}
          age={currentPatient.age}
          gender={currentPatient.gender}
          isDoctor={isDoctor}
          viewingAsPatient={viewingAsPatient}
          onToggleViewMode={handleToggleViewMode}
          onExit={isFromMediDoc ? handleExitToConversation : undefined}
        />


        {/* <PatientSectionGroup
          sections={PATIENT_SECTIONS}
          sectionKeys={[
            'medications',
            'medical_events',
            'health_profile',
            'health_conditions',
            ...(currentPatient.isMainPatient
              ? ['contact_details', 'emergency_contact']
              : []),
          ]}
          isViewingAsDoctor={isViewingAsDoctor}
        /> */}
        <View className="px-4">

          <ProfileCard className="mt-3">
            <ProfileRow
              title="Medications"
              description="Current and past medications"
              href="/tabs/patients/medications"
              icon="pill"
              iconSize={36}
              isLast={false}
            />
            {!isFromMediDoc && (
              <ProfileRow
                title="Health Calendar"
                description="Scheduled visits and examinations"
                href="/tabs/patients/medical-events"
                icon="calendar-clock"
                iconSize={36}
                isLast={false}
              />
            )}
            <ProfileRow
              title="Health Profile"
              description="Vitals, body metrics, immunizations, lifestyle"
              href="/tabs/patients/health-profile"
              icon="heart-pulse"
              iconSize={36}
              isLast={isFromMediDoc}
            />
            <ProfileRow
              title="Health Conditions"
              description="Diagnosed conditions, chronic illnesses"
              href="/tabs/patients/health-conditions"
              icon="medical-bag"
              iconSize={36}
              isLast={false}
            />
            <ProfileRow
              title="Clinical Procedures"
              description="Scheduled and past surgical procedures"
              href="/tabs/patients/medical-procedures"
              icon="needle"
              iconSize={36}
              isLast={true}
            />
          </ProfileCard>

          {/* 3. Profile Information Group - Contact, Addresses */}
          {/* Show for main patient OR when viewing from MediDoc (hooks now support PatientViewContext) */}
          {(currentPatient.isMainPatient || isFromMediDoc) && (
            <ProfileCard className="mt-3">
              <ProfileRow
                title="Contact Details"
                description="Address, phone numbers, contact preferences"
                href="/tabs/patients/contact-details"
                icon="email"
                iconSize={36}
                isLast={false}
              />
              <ProfileRow
                title="Emergency Contact"
                description="ICE contact information"
                href="/tabs/patients/emergency-contact"
                icon="phone-alert"
                iconSize={36}
                isLast={true}
              />
            </ProfileCard>
          )}
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>
    </StandardScreenLayout>
  );
};

export default PatientsTab;
