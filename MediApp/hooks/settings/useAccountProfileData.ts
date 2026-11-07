import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { useDoctorProfile } from '../doctor/useDoctorProfile';

interface ProfileData {
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  fullName: string;
}

export const useAccountProfileData = () => {
  const { authState } = useAuthContext();
  const patientContext = usePatientContext();
  const doctorProfile = useDoctorProfile();

  console.log(authState);

  // Determine user role and get profile data accordingly
  const userRole = authState?.user?.role;
  const isDoctor = userRole === 'doctor';
  const isPatient = userRole === 'patient';

  // Determine loading state based on role
  const isLoading = useMemo(() => {
    if (isDoctor) {
      return doctorProfile.isLoading;
    } else if (isPatient) {
      return patientContext.isLoading;
    }
    return false;
  }, [isDoctor, isPatient, doctorProfile.isLoading, patientContext.isLoading]);

  // Get profile data based on role
  const profileData: ProfileData = useMemo(() => {
    if (isDoctor && doctorProfile.profile) {
      return {
        email: authState?.user?.email || '',
        phone:
          authState?.user?.phone_number ||
          doctorProfile.profile.phone_number ||
          '',
        emailVerified: !!doctorProfile.profile.is_verified, // Doctor verification status
        phoneVerified: false, // Phone verification not yet implemented for doctors
        fullName:
          doctorProfile.profile.full_name ||
          `${doctorProfile.profile.first_name || ''} ${doctorProfile.profile.last_name || ''}`.trim(),
      };
    } else if (isPatient && patientContext.currentPatient) {
      // Patient context data may not have email/phone directly - fallback to auth state for these fields
      return {
        email: authState?.user?.email || '',
        phone: authState?.user?.phone_number || '', // Use server data, not local state
        emailVerified: !!authState?.user?.is_email_verified,
        phoneVerified: !!authState?.user?.is_phone_verified, // Use actual phone verification status
        fullName: patientContext.currentPatient.full_name || '',
      };
    } else if (authState?.user) {
      // Fallback to auth state if contexts haven't loaded yet
      return {
        email: authState.user.email || '',
        phone: authState.user.phone_number || '', // Use server data, not local state
        emailVerified: !!authState.user.is_email_verified,
        phoneVerified: !!authState.user.is_phone_verified, // Use actual phone verification status
        fullName:
          `${authState.user.first_name || ''} ${authState.user.last_name || ''}`.trim(),
      };
    }
    return {
      email: '',
      phone: '',
      emailVerified: false,
      phoneVerified: false,
      fullName: '',
    };
  }, [
    isDoctor,
    isPatient,
    doctorProfile.profile,
    patientContext.currentPatient,
    authState?.user,
  ]);

  return {
    profileData,
    isLoading,
    isDoctor,
    isPatient,
    userRole,
  };
};
