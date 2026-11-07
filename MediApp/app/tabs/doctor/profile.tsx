import React from 'react';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  DoctorScreenHeader,
  ProfileForm,
} from '@/components/features/doctor/profile';

const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }}
    >
      <DoctorScreenHeader title="Profile" />
      <KeyboardAwareScrollView
        enableOnAndroid={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        className="flex-1"
      >
        <ProfileForm />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
