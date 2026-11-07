import { useRouter } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  View,
} from 'react-native';

import {
  ForgotPasswordFooter,
  ForgotPasswordHeader,
  RequestResetForm,
  ResetPasswordForm,
} from '@/components/auth/forgotPassword';
import { logger, validatePassword } from '@/utils';
import {
  useAnimatedFormField,
  useFormValidation,
  useResetPasswordWithCodeMutation,
  commonValidationRules,
} from '@/hooks';
import { SafeAreaView } from 'react-native-safe-area-context';

type ForgotPasswordFormField = 'email';
type ResetPasswordFormField = 'code' | 'newPassword' | 'confirmPassword';

interface ResetPasswordFormData {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

type ScreenStep = 'request' | 'reset';

const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ScreenStep>('request');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#FFFFFF');
  }, []);

  const {
    formData: emailFormData,
    errors: emailErrors,
    handleInputChange: handleEmailChange,
    validateForm: validateEmailForm,
  } = useFormValidation<ForgotPasswordFormField>(
    { email: '' },
    {
      email: commonValidationRules.email,
    }
  );

  const {
    formData: resetFormData,
    errors: resetErrors,
    handleInputChange: handleResetChange,
    validateForm: validateResetForm,
  } = useFormValidation<ResetPasswordFormField>(
    { code: '', newPassword: '', confirmPassword: '' },
    {
      code: (value: string) => {
        if (!value) return 'Verification code is required';
        if (!/^\d{6}$/.test(value)) {
          return 'Code must be exactly 6 digits';
        }
        return null;
      },
      newPassword: validatePassword,
      confirmPassword: (value: string, formData?: ResetPasswordFormData) => {
        if (!value) return 'Please confirm your password';
        if (value !== formData?.newPassword) {
          return 'Passwords do not match';
        }
        return null;
      },
    }
  );

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(
    ['email', 'code', 'newPassword', 'confirmPassword'],
    'white'
  );

  const resetPasswordMutation = useResetPasswordWithCodeMutation();

  const handleEmailSubmit = async () => {
    if (!validateEmailForm()) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      logger.auditLog('password_reset_requested', '', {
        email: emailFormData.email,
      });

      setUserEmail(emailFormData.email);
      setCurrentStep('reset');

      logger.info('Password reset email sent', {
        component: 'ForgotPasswordScreen',
        email: emailFormData.email,
      });
    } catch (error) {
      logger.error('Password reset failed', error as Error, {
        component: 'ForgotPasswordScreen',
        email: emailFormData.email,
      });

      Alert.alert(
        'Error',
        'Unable to process password reset request. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!validateResetForm()) {
      Alert.alert('Validation Error', 'Please check all fields and try again');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordMutation.mutateAsync({
        email: userEmail,
        code: resetFormData.code,
        new_password: resetFormData.newPassword,
      });

      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset successfully. You can now sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(SignIn)/SignInScreen'),
          },
        ]
      );

      logger.info('Password reset completed successfully', {
        component: 'ForgotPasswordScreen',
        email: userEmail,
      });
    } catch (error) {
      logger.error('Password reset failed', error as Error, {
        component: 'ForgotPasswordScreen',
        email: userEmail,
      });

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to reset password. Please try again.';
      Alert.alert('Reset Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          <View className="flex-1 justify-center px-6">
            {currentStep === 'request' ? (
              <>
                <ForgotPasswordHeader
                  title="Reset Password"
                  description="Enter your email address and we'll send you instructions to reset your password."
                />

                <RequestResetForm
                  email={emailFormData.email}
                  emailError={emailErrors.email}
                  isSubmitting={isSubmitting}
                  isActive={selectedInput === 'email'}
                  borderColor={getBorderColor('email')}
                  labelStyle={getLabelStyle('email')}
                  onEmailChange={(text: string) =>
                    handleEmailChange('email', text)
                  }
                  onFocus={() => handleFocus('email')}
                  onBlur={() => handleBlur('email')}
                  onSubmit={handleEmailSubmit}
                  onBack={() => router.back()}
                />
              </>
            ) : (
              <>
                <ForgotPasswordHeader
                  title="Reset Password"
                  description={`Enter the verification code sent to ${userEmail} and your new password.`}
                />

                <ResetPasswordForm
                  code={resetFormData.code}
                  newPassword={resetFormData.newPassword}
                  confirmPassword={resetFormData.confirmPassword}
                  errors={{
                    code: resetErrors.code,
                    newPassword: resetErrors.newPassword,
                    confirmPassword: resetErrors.confirmPassword,
                  }}
                  isSubmitting={isSubmitting}
                  selectedInput={selectedInput || ''}
                  getBorderColor={(field: string) =>
                    getBorderColor(field as any)
                  }
                  getLabelStyle={(field: string) => getLabelStyle(field as any)}
                  onCodeChange={(text: string) =>
                    handleResetChange(
                      'code',
                      text.replace(/\D/g, '').slice(0, 6)
                    )
                  }
                  onNewPasswordChange={(text: string) =>
                    handleResetChange('newPassword', text)
                  }
                  onConfirmPasswordChange={(text: string) =>
                    handleResetChange('confirmPassword', text)
                  }
                  onFocus={(field: string) => handleFocus(field as any)}
                  onBlur={(field: string) => handleBlur(field as any)}
                  onSubmit={handlePasswordReset}
                  onBackToEmail={() => setCurrentStep('request')}
                  onResendCode={handleEmailSubmit}
                />
              </>
            )}
          </View>

          <ForgotPasswordFooter onSignInPress={() => router.back()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
