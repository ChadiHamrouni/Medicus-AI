import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import {
  ContactInformation,
  PasswordChange,
} from '@/components/features/settings';
import { useAccountProfileData } from '@/hooks/settings/useAccountProfileData';
import { useAccountMutations } from '@/hooks/settings/useAccountMutations';
import { ThreeDotsLoader } from '@/components';
import { ScrollView } from 'react-native-gesture-handler';

const AccountSettings: React.FC = () => {
  const router = useRouter();
  const { profileData, isLoading } = useAccountProfileData();
  const {
    isUpdatingContact,
    isChangingPassword,
    handlePhoneUpdate,
    handlePasswordChange,
  } = useAccountMutations();

  return (
    <StandardScreenLayout
      title="Account Settings"
      onBack={() => router.back()}
      noScroll
    >
      {isLoading ? (
        <ThreeDotsLoader size={24} />
      ) : (
        <View className="flex-1 bg-white">
          <ScrollView
            className="flex-1 bg-white"
            showsVerticalScrollIndicator={false}
          >
            <ContactInformation
              profileData={profileData}
              onPhoneUpdate={handlePhoneUpdate}
              isUpdatingContact={isUpdatingContact}
            />

            <PasswordChange
              onPasswordChange={handlePasswordChange}
              isUpdating={isChangingPassword}
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
