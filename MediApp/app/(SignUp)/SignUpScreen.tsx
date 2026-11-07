import { NewSignUpForm, SignUpHeader } from '@/components/auth/signup';
import { Footer } from '@/components/shared/ui';
import { useLocalSearchParams } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

const SignUpScreen = () => {
  const { role } = useLocalSearchParams<{ role?: string }>();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#FFFFFF'); // Change system bar color
  }, []);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <KeyboardAwareScrollView
        enableOnAndroid={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <SignUpHeader />

        <NewSignUpForm initialRole={role as 'patient' | 'doctor'} />

        {/* <Footer /> */}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SignUpScreen;
