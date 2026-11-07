import * as SystemUI from 'expo-system-ui';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Platform,
  StatusBar,
  View,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { SignInFooter, SignInForm, SignInHeader } from '@/components';

const SignInScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { accountCreated, emailVerified, message } = useLocalSearchParams<{
    accountCreated?: string;
    emailVerified?: string;
    message?: string;
  }>();
  const showSuccessMessage =
    accountCreated === 'true' || emailVerified === 'true';
  // const { login, authState } = useAuthContext();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#FFFFFF'); // Change system bar color
  }, []);

  // Auto-login disabled - user must manually enter credentials
  // Password bypass will still work for ExpoGo in development

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Math.max(insets.bottom + 20, 24),
          }}
        >
          <View className="flex-1">
            <View className="flex-1 justify-center px-6">
              <SignInHeader />
              <SignInForm
                showSuccessMessage={showSuccessMessage}
                successMessage={message}
                isEmailVerified={emailVerified === 'true'}
              />
              <SignInFooter />
            </View>
            <View className="pb-4"></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignInScreen;
