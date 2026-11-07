import {
  EmailVerificationHeader,
  ResendCodeButton,
  VerificationCodeInput,
} from '@/components/auth/emailVerification';
import { CustomModal, Footer } from '@/components/shared/ui';
import {
  useCountdownTimer,
  useModal,
  useSendVerificationCodeMutation,
  useVerifyEmailMutation,
} from '@/hooks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type VerificationType = 'email' | 'phone';

const VerificationScreen = () => {
  const router = useRouter();

  // Get params from the route
  const params = useLocalSearchParams<{
    email?: string;
    phone?: string;
    role?: string;
    type?: string;
  }>();

  // Determine verification type based on params
  const [verificationType] = useState<VerificationType>(
    params.type === 'phone' || params.phone ? 'phone' : 'email'
  );

  // Set contact info based on verification type
  const [contactInfo] = useState<string>(
    verificationType === 'phone' ? params.phone || '' : params.email || ''
  );

  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);

  const { modalProps, showModal, hideModal } = useModal();

  // Mutation hooks
  const sendVerificationCodeMutation = useSendVerificationCodeMutation();
  const verifyEmailMutation = useVerifyEmailMutation();

  const {
    timeLeft,
    isRunning: isTimerRunning,
    startTimer,
  } = useCountdownTimer({
    initialTime: 60,
    onComplete: () => {},
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#FFFFFF');
  }, []);

  const handleVerify = React.useCallback(async () => {
    if (!verificationCode || verificationCode.length < 6) {
      showModal('error', 'Error', 'Please enter a valid verification code');
      return;
    }

    setIsLoading(true);
    try {
      if (verificationType === 'email') {
        await verifyEmailMutation.mutateAsync({
          email: contactInfo,
          code: verificationCode,
        });
      } else {
        // Phone verification would go here when implemented
        throw new Error('Phone verification not yet implemented');
      }

      router.push({
        pathname: '/(SignIn)/SignInScreen' as const,
        params: {
          emailVerified: 'true',
          message: `Your ${verificationType === 'email' ? 'email' : 'phone'} has been successfully verified. You can now sign in to your account.`,
        },
      });
    } catch (error: any) {
      showModal(
        'error',
        'Verification Failed',
        error.message ||
          `Failed to verify ${verificationType}. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    verificationCode,
    verificationType,
    showModal,
    router,
    contactInfo,
    verifyEmailMutation,
  ]);

  const handleResendCode = React.useCallback(async () => {
    if (isTimerRunning) return;

    setResendLoading(true);
    try {
      if (verificationType === 'email') {
        await sendVerificationCodeMutation.mutateAsync({
          email: contactInfo,
        });
      } else {
        // Phone verification would go here when implemented
        throw new Error('Phone verification not yet implemented');
      }

      showModal(
        'success',
        'Success',
        `Verification code has been resent to your ${verificationType}`,
        () => hideModal()
      );
      startTimer();
    } catch (error: any) {
      showModal(
        'error',
        'Failed to Resend',
        error.message || 'Failed to resend verification code. Please try again.'
      );
    } finally {
      setResendLoading(false);
    }
  }, [
    verificationType,
    isTimerRunning,
    showModal,
    startTimer,
    hideModal,
    contactInfo,
    sendVerificationCodeMutation,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Custom Modal */}
      <CustomModal {...modalProps} />

      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8 items-center justify-center">
          <View className="w-full max-w-md">
            <EmailVerificationHeader
              title={`Verify Your ${verificationType === 'email' ? 'Email' : 'Phone'}`}
              subtitle={`We have sent a verification code to ${contactInfo}. Please enter the code below.`}
            />

            <VerificationCodeInput
              verificationCode={verificationCode}
              onChangeCode={setVerificationCode}
              onSubmit={handleVerify}
              isLoading={isLoading}
            />

            <ResendCodeButton
              canResend={!isTimerRunning}
              timeLeft={timeLeft}
              resendLoading={resendLoading}
              onResend={handleResendCode}
            />
          </View>
        </View>
        <Footer />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default VerificationScreen;
