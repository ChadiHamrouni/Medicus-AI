import { Button, Divider, PasswordField } from '@/components/shared/ui';
import { FormField } from '@/components/shared/ui/Form/FormField';
import { useAuthContext } from '@/contexts/AuthContext';
import { commonValidationRules, useFormValidation } from '@/hooks';
import { env } from '@/utils';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type FormFieldKey = 'email' | 'password';

interface SignInFormProps {
  showSuccessMessage?: boolean;
  successMessage?: string;
  isEmailVerified?: boolean;
}

const SignInForm: React.FC<SignInFormProps> = ({
  showSuccessMessage = false,
  successMessage,
  isEmailVerified = false,
}) => {
  const router = useRouter();
  const { login, authState, clearError } = useAuthContext();
  const [showSuccess, setShowSuccess] = useState(showSuccessMessage);

  const {
    formData,
    errors,
    touched,
    handleInputChange,
    handleBlur,
    validateForm,
  } = useFormValidation<FormFieldKey>(
    { email: '', password: '' },
    {
      email: (value: string) => {
        if (!value?.trim()) return 'Email or phone number is required';
        // Accept both email and phone formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // More flexible phone regex - accept 7+ digits (supports various countries)
        const phoneRegex = /^[+]?[\d\s\-\(\)]{7,}$/;
        if (
          !emailRegex.test(value) &&
          !phoneRegex.test(value.replace(/\s/g, ''))
        ) {
          return 'Please enter a valid email address or phone number';
        }
        return null;
      },
      password: commonValidationRules.password,
    }
  );

  // Pre-fill form with development credentials for easier manual login
  // useEffect(() => {
  //   if (env.isDevelopment) {
  //     handleInputChange('email', '5342563256');
  //     handleInputChange('password', 'Test1234$$');
  //   }
  // }, [handleInputChange]);

  const handleSignIn = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.email, formData.password);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Sign In Failed', errorMessage);
    }
  };

  const handleGoogleSignIn = () => {
    // Google sign-in would be implemented here
    Alert.alert('Google Sign In', 'Google sign-in is not implemented yet');
  };

  return (
    <View className="mt-2">
      {/* Authentication Error Display */}
      {authState.error && (
        <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <Text className="text-red-700 text-sm text-center">
            {authState.error.message ||
              'Sign in failed. Please check your credentials and try again.'}
          </Text>
        </View>
      )}

      {/* Success Message Banner */}
      {showSuccess && (
        <View className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <View className="flex-row items-start">
            <Text className="text-green-600 text-lg mr-2">✓</Text>
            <View className="flex-1">
              <Text className="text-green-800 font-semibold text-base mb-1">
                {isEmailVerified
                  ? 'Email Verified Successfully!'
                  : 'Account Created Successfully!'}
              </Text>
              <Text className="text-green-700 text-sm">
                {successMessage ||
                  (isEmailVerified
                    ? 'Your email has been successfully verified. You can now sign in to your account.'
                    : 'Your account has been created successfully. You can now sign in with your credentials.')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowSuccess(false)}
              className="ml-2 p-1"
              activeOpacity={0.7}
            >
              <Text className="text-green-600 text-lg font-bold">×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="mb-6">
        <FormField
          type="text"
          field="email"
          value={formData.email}
          label="Email or Phone"
          onChangeText={text => {
            handleInputChange('email', text);
            if (authState.error) {
              clearError();
            }
          }}
          onBlur={() => handleBlur('email')}
          keyboardType="default"
          error={errors.email}
          touched={touched.email}
          backgroundColor="white"
        />
      </View>

      <View className="mb-6">
        <PasswordField
          field="password"
          value={formData.password}
          label="Password"
          onChangeText={text => {
            handleInputChange('password', text);
            if (authState.error) {
              clearError();
            }
          }}
          onBlur={() => handleBlur('password')}
          error={errors.password}
          touched={touched.password}
          backgroundColor="white"
        />
      </View>

      <Button
        onPress={handleSignIn}
        title={'Sign In'}
        containerClassName={`w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-4 py-4 ${authState.isLoading ? 'bg-gray-300' : ''}`}
        textClassName={`text-white font-semibold text-base`}
        disabled={
          authState.isLoading ||
          (!!authState.error &&
            (!formData.email.trim() || !formData.password.trim())) ||
          !formData.email.trim() ||
          !formData.password.trim()
        }
      >
        {authState.isLoading && (
          <ActivityIndicator size="small" color="#FFFFFF" className="ml-2" />
        )}
      </Button>

      {/* Forgot Password Link */}
      {/* <TouchableOpacity
        onPress={() => router.push('/(SignIn)/ForgotPasswordScreen' as any)}
        className="mb-6"
        disabled={authState.isLoading}
      >
        <Text className="text-center text-blue-600 font-medium text-base">
          Forgot your password?
        </Text>
      </TouchableOpacity> */}

      {/* <Divider />

      <Button
        onPress={handleGoogleSignIn}
        title={'Sign in with Google'}
        containerClassName="bg-white w-full h-16 border border-gray-300 rounded-lg flex-row items-center justify-center py-4"
        textClassName="text-gray-700 font-semibold text-base"
        disabled={authState.isLoading}
      >
        <Image
          source={require('./../../../assets/images/google-logo.png')}
          className="w-6 h-6 ml-2"
        />
      </Button> */}
    </View>
  );
};

export default SignInForm;
