import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import {
  ContactInformation,
  PasswordChange,
  AccountStatus,
} from '@/components/features/settings';
import { useAccountProfileData } from '@/hooks/settings/useAccountProfileData';
import { useAccountMutations } from '@/hooks/settings/useAccountMutations';
import { ThreeDotsLoader } from '@/components';
import { ScrollView } from 'react-native-gesture-handler';

const AccountSettings: React.FC = () => {
  const router = useRouter();
  const { profileData, isLoading } = useAccountProfileData();
  const {
    // Mutation states
    isUpdatingContact,
    isRefreshingAfterVerification,
    isSendingVerification,
    isVerifyingCode,
    isChangingPassword,

    // Mutation handlers
    handlePhoneUpdate,
    handlePasswordChange,
    handleSendEmailVerification,
    handleVerifyEmailCode,
    handlePasswordVerification,
    handleDeleteAccount,
  } = useAccountMutations();

  const handlePhoneVerification = () => {
    Alert.alert(
      'Phone Verification',
      'Phone verification is not yet available. This feature will be added in a future update.',
      [{ text: 'OK' }]
    );
  };

  return (
    <StandardScreenLayout
      title="Account Settings"
      onBack={() => router.back()}
      noScroll
    >
      {isLoading ? (
        <ThreeDotsLoader size={24} />
      ) : (
        // Show actual content when loaded
        <View className="flex-1 bg-white">
          <ScrollView
            className="flex-1 bg-white"
            showsVerticalScrollIndicator={false}
          >
            {/* Contact Information */}
            <ContactInformation
              profileData={profileData}
              onPhoneUpdate={handlePhoneUpdate}
              isUpdatingContact={isUpdatingContact}
            />

            {/* Password Change */}
            <PasswordChange
              onPasswordChange={handlePasswordChange}
              isUpdating={isChangingPassword}
            />

            {/* Account Status */}
            <AccountStatus
              profileData={profileData}
              authUserEmail={profileData.email}
              onSendEmailVerification={() =>
                handleSendEmailVerification(profileData.email)
              }
              onVerifyEmailCode={code =>
                handleVerifyEmailCode(profileData.email, code)
              }
              onPhoneVerification={handlePhoneVerification}
              isSendingVerification={isSendingVerification}
              isVerifyingCode={isVerifyingCode}
              isRefreshingAfterVerification={isRefreshingAfterVerification}
            />
          </ScrollView>
        </View>
      )}

      {/* Bottom spacing */}
      <View className="h-8" />
    </StandardScreenLayout>
  );
};

export default AccountSettings;
