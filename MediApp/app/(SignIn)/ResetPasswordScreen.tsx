import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Button, FormFieldWrapper } from '@/components/shared/ui';
import { useResetPasswordWithCodeMutation } from '@/hooks/auth/mutations';
import { useAnimatedFormField, useFormValidation } from '@/hooks/ui/forms';
import { logger } from '@/utils';

type ResetPasswordFormField = 'code' | 'newPassword' | 'confirmPassword';

interface ResetPasswordFormData {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

const ResetPasswordScreen: React.FC = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValidation = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(value)) {
      return 'Password must contain at least one digit';
    }
    return null;
  };

  const { formData, errors, handleInputChange, validateForm } =
    useFormValidation<ResetPasswordFormField>(
      { code: '', newPassword: '', confirmPassword: '' },
      {
        code: (value: string) => {
          if (!value) return 'Verification code is required';
          if (!/^\d{6}$/.test(value)) {
            return 'Code must be exactly 6 digits';
          }
          return null;
        },
        newPassword: passwordValidation,
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
  } = useAnimatedFormField(['code', 'newPassword', 'confirmPassword'], 'white');

  const resetPasswordMutation = useResetPasswordWithCodeMutation();

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check all fields and try again');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is required. Please go back and start over.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordMutation.mutateAsync({
        email,
        code: formData.code,
        new_password: formData.newPassword,
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
        component: 'ResetPasswordScreen',
        email,
      });
    } catch (error) {
      logger.error('Password reset failed', error as Error, {
        component: 'ResetPasswordScreen',
        email,
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

  const handleBackToSignIn = () => {
    router.replace('/(SignIn)/SignInScreen');
  };

  return (
    <KeyboardAwareScrollView
      enableOnAndroid={true}
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-white"
    >
      <View className="flex-1 px-6 pt-12">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </Text>
          <Text className="text-gray-600 text-base leading-6">
            Enter the verification code sent to {email} and your new password.
          </Text>
        </View>

        {/* Form */}
        <View className="mb-6 space-y-4">
          <FormFieldWrapper
            type="text"
            field="code"
            value={formData.code}
            label="Verification Code"
            isActive={selectedInput === 'code'}
            borderColor={errors.code ? '#EF4444' : getBorderColor('code')}
            labelStyle={getLabelStyle('code')}
            onFocus={() => handleFocus('code')}
            onBlur={() => handleBlur('code')}
            onChangeText={text =>
              handleInputChange('code', text.replace(/\D/g, '').slice(0, 6))
            }
            keyboardType="numeric"
            errorMessage={errors.code}
          />

          <FormFieldWrapper
            type="text"
            field="newPassword"
            value={formData.newPassword}
            label="New Password"
            isActive={selectedInput === 'newPassword'}
            borderColor={
              errors.newPassword ? '#EF4444' : getBorderColor('newPassword')
            }
            labelStyle={getLabelStyle('newPassword')}
            onFocus={() => handleFocus('newPassword')}
            onBlur={() => handleBlur('newPassword')}
            onChangeText={text => handleInputChange('newPassword', text)}
            secureTextEntry={true}
            errorMessage={errors.newPassword}
          />

          <FormFieldWrapper
            type="text"
            field="confirmPassword"
            value={formData.confirmPassword}
            label="Confirm New Password"
            isActive={selectedInput === 'confirmPassword'}
            borderColor={
              errors.confirmPassword
                ? '#EF4444'
                : getBorderColor('confirmPassword')
            }
            labelStyle={getLabelStyle('confirmPassword')}
            onFocus={() => handleFocus('confirmPassword')}
            onBlur={() => handleBlur('confirmPassword')}
            onChangeText={text => handleInputChange('confirmPassword', text)}
            secureTextEntry={true}
            errorMessage={errors.confirmPassword}
          />
        </View>

        {/* Password Requirements */}
        <View className="mb-6 p-4 bg-gray-50 rounded-lg">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Password Requirements:
          </Text>
          <Text className="text-xs text-gray-600 leading-4">
            • At least 8 characters long{'\n'}• Contains uppercase and lowercase
            letters{'\n'}• Contains at least one number
          </Text>
        </View>

        {/* Buttons */}
        <View className="mt-8 space-y-4">
          <Button
            title={isSubmitting ? 'Resetting...' : 'Reset Password'}
            onPress={handleSubmit}
            disabled={isSubmitting}
            containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-4 py-4"
            textClassName="text-white font-semibold text-base"
          />

          <Button
            title="Back to Sign In"
            onPress={handleBackToSignIn}
            containerClassName="bg-white w-full h-14 border border-gray-300 rounded-lg flex-row items-center justify-center py-4"
            textClassName="text-gray-700 font-semibold text-base"
            disabled={isSubmitting}
          />
        </View>

        {/* Footer */}
        <View className="mt-12 mb-8">
          <Text className="text-center text-gray-500 text-sm">
            Didn&apos;t receive the code?{' '}
            <Text
              className="text-blue-600 font-medium"
              onPress={() => router.back()}
            >
              Request New Code
            </Text>
          </Text>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default ResetPasswordScreen;
