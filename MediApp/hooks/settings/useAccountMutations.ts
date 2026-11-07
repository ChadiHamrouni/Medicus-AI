import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { useDoctorProfile } from '../doctor/useDoctorProfile';
import {
  useChangePasswordMutation,
  useSendVerificationCodeMutation,
  useDeleteUserMutation,
  useVerifyEmailMutation,
  useUpdateCurrentUserMutation,
} from '../auth/mutations/useAuthMutations';
import { logger } from '@/utils';

export const useAccountMutations = () => {
  const { authState, logout, getCurrentUser } = useAuthContext();
  const patientContext = usePatientContext();
  const doctorProfile = useDoctorProfile();

  const changePasswordMutation = useChangePasswordMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const sendVerificationCodeMutation = useSendVerificationCodeMutation();
  const verifyEmailMutation = useVerifyEmailMutation();
  const updateCurrentUserMutation = useUpdateCurrentUserMutation();

  const [isUpdatingContact, setIsUpdatingContact] = useState(false);
  const [isRefreshingAfterVerification, setIsRefreshingAfterVerification] =
    useState(false);

  // Determine user role
  const userRole = authState?.user?.role;
  const isDoctor = userRole === 'doctor';
  const isPatient = userRole === 'patient';

  const handlePhoneUpdate = async (fullPhoneNumber: string) => {
    setIsUpdatingContact(true);
    try {
      // Handle updates based on user role
      if (isDoctor) {
        // Update doctor contact info using doctor profile context - use full number with country code
        await doctorProfile.updateContactInfo({
          professional_phone: fullPhoneNumber,
        });
      } else if (isPatient) {
        // Save full phone number with country code for patients
        const updateData = { phone: fullPhoneNumber };
        await updateCurrentUserMutation.mutateAsync(updateData);

        // Schedule background refresh
        setTimeout(async () => {
          try {
            await patientContext.refresh();
            logger.info(
              'Background refresh completed after phone update via patient context',
              {
                component: 'AccountMutations',
              }
            );
          } catch (error) {
            logger.warn('Background refresh failed after phone update', {
              component: 'AccountMutations',
              error: error as Error,
            });
          }
        }, 2000);
      } else {
        // Fallback for other roles - use full number with country code
        const updateData = { phone: fullPhoneNumber };
        await updateCurrentUserMutation.mutateAsync(updateData);

        // Schedule background refresh
        setTimeout(async () => {
          try {
            await getCurrentUser();
            logger.info('Background refresh completed after phone update', {
              component: 'AccountMutations',
            });
          } catch (error) {
            logger.warn('Background refresh failed after phone update', {
              component: 'AccountMutations',
              error: error as Error,
            });
          }
        }, 2000);
      }
    } finally {
      setIsUpdatingContact(false);
    }
  };

  const handlePasswordChange = async (data: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    await changePasswordMutation.mutateAsync(data);
  };

  const handleSendEmailVerification = async (email: string) => {
    await sendVerificationCodeMutation.mutateAsync({ email });
  };

  const handleVerifyEmailCode = async (email: string, code: string) => {
    await verifyEmailMutation.mutateAsync({ email, code });

    // Set refreshing state and schedule background refresh to get updated verification status
    setIsRefreshingAfterVerification(true);
    setTimeout(async () => {
      try {
        // Use background refresh based on user role - no blocking UI updates
        if (isDoctor) {
          await doctorProfile.refetch(true);
        } else if (isPatient) {
          await patientContext.refresh();
        } else {
          // Fallback for other roles
          await getCurrentUser();
        }
        logger.info('Background refresh completed after email verification', {
          component: 'AccountMutations',
        });
      } catch (error) {
        logger.warn('Failed to refresh user data after verification', {
          component: 'AccountMutations',
          error: error as Error,
        });
      } finally {
        setIsRefreshingAfterVerification(false);
      }
    }, 1000);
  };

  const handlePasswordVerification = async (password: string) => {
    // First verify the password by attempting to change it to itself
    // This is a security measure to ensure the user knows their current password
    await changePasswordMutation.mutateAsync({
      old_password: password,
      new_password: password,
      confirm_password: password,
    });
  };

  const handleDeleteAccount = async () => {
    await deleteUserMutation.mutateAsync();
    // Log out the user after successful deletion
    await logout();
  };

  return {
    // Mutation states
    isUpdatingContact,
    isRefreshingAfterVerification,
    isSendingVerification: sendVerificationCodeMutation.isPending,
    isVerifyingCode: verifyEmailMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isDeletingAccount: deleteUserMutation.isPending,
    isUpdatingUser: updateCurrentUserMutation.isPending,
    isDoctorUpdatingContact: doctorProfile.isUpdatingContactInfo,

    // Mutation handlers
    handlePhoneUpdate,
    handlePasswordChange,
    handleSendEmailVerification,
    handleVerifyEmailCode,
    handlePasswordVerification,
    handleDeleteAccount,
  };
};
