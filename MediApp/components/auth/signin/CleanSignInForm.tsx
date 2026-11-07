import {
  Button,
  FormFieldWrapper,
  PasswordField,
} from '@/components/shared/ui';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  commonValidationRules,
  useAnimatedFormField,
  useFormValidation,
} from '@/hooks';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

type SignInMethod = 'email' | 'phone';
type FormFieldKey = 'emailOrPhone' | 'password';

const CleanSignInForm: React.FC = () => {
  const router = useRouter();
  const { login, authState, clearError } = useAuthContext();
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('email');

  const validationRules = {
    emailOrPhone: (value: string) => {
      if (!value?.trim())
        return `${signInMethod === 'email' ? 'Email' : 'Phone number'} is required`;

      if (signInMethod === 'email') {
        return commonValidationRules.email(value);
      } else {
        // Basic phone validation
        const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(value.replace(/\s/g, ''))
          ? null
          : 'Please enter a valid phone number';
      }
    },
    password: commonValidationRules.password,
  };

  const { formData, errors, handleInputChange, validateForm } =
    useFormValidation<FormFieldKey>(
      { emailOrPhone: '', password: '' },
      validationRules
    );

  const formFields: FormFieldKey[] = ['emailOrPhone', 'password'];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields);

  const handleSignIn = async () => {
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      // For phone signin, we might need to convert phone to email lookup or use different endpoint
      const loginCredential = formData.emailOrPhone;

      if (signInMethod === 'phone') {
        // If backend doesn't support direct phone login, we might need to:
        // 1. Look up user by phone to get email, or
        // 2. Use phone-specific login endpoint
        // For now, we'll use the phone as-is and let the backend handle it
      }

      await login(loginCredential, formData.password);
      // Navigation is handled in the login function
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign in failed';
      Alert.alert('Sign In Failed', errorMessage);
    }
  };

  const handleMethodToggle = (method: SignInMethod) => {
    setSignInMethod(method);
    // Clear form when switching methods
    handleInputChange('emailOrPhone', '');
    handleInputChange('password', '');
  };

  const handleForgotPassword = () => {
    router.push('/(SignIn)/ForgotPasswordScreen' as const);
  };

  const handleSignUp = () => {
    router.push('/(SignUp)/RoleSelectionScreen' as const);
  };

  const isFormValid =
    formData.emailOrPhone.trim() &&
    formData.password &&
    !errors.emailOrPhone &&
    !errors.password;

  return (
    <View className="w-full max-w-md mx-auto px-4">
      {/* Method Toggle */}
      <View className="flex-row bg-gray-100 rounded-lg p-1 mb-6">
        <TouchableOpacity
          onPress={() => handleMethodToggle('email')}
          className={`flex-1 py-3 rounded-md ${
            signInMethod === 'email' ? 'bg-white shadow-sm' : ''
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`text-center font-medium ${
              signInMethod === 'email' ? 'text-[#F05C0C]' : 'text-gray-600'
            }`}
          >
            Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleMethodToggle('phone')}
          className={`flex-1 py-3 rounded-md ${
            signInMethod === 'phone' ? 'bg-white shadow-sm' : ''
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`text-center font-medium ${
              signInMethod === 'phone' ? 'text-[#F05C0C]' : 'text-gray-600'
            }`}
          >
            Phone
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email/Phone Input */}
      <View className="mb-4">
        <FormFieldWrapper
          type="text"
          field="emailOrPhone"
          value={formData.emailOrPhone}
          label={signInMethod === 'email' ? 'Email' : 'Phone Number'}
          placeholder={
            signInMethod === 'email'
              ? 'Enter your email'
              : 'Enter your phone number'
          }
          isActive={selectedInput === 'emailOrPhone'}
          borderColor={
            errors.emailOrPhone ? '#EF4444' : getBorderColor('emailOrPhone')
          }
          labelStyle={getLabelStyle('emailOrPhone')}
          onFocus={() => handleFocus('emailOrPhone')}
          onBlur={() => handleBlur('emailOrPhone')}
          onChangeText={text => handleInputChange('emailOrPhone', text)}
          keyboardType={
            signInMethod === 'email' ? 'email-address' : 'phone-pad'
          }
          autoCapitalize="none"
          autoCorrect={false}
          errorMessage={errors.emailOrPhone}
        />
        {formData.emailOrPhone.trim() && !errors.emailOrPhone && (
          <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Text className="text-green-500 text-lg">✓</Text>
          </View>
        )}
      </View>

      {/* Password Input */}
      <View className="mb-6">
        <PasswordField
          field="password"
          value={formData.password}
          label="Password"
          placeholder="Enter your password"
          isActive={selectedInput === 'password'}
          borderColor={errors.password ? '#EF4444' : getBorderColor('password')}
          labelStyle={getLabelStyle('password')}
          onFocus={() => handleFocus('password')}
          onBlur={() => handleBlur('password')}
          onChangeText={text => handleInputChange('password', text)}
          errorMessage={errors.password}
        />
        {formData.password && !errors.password && (
          <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Text className="text-green-500 text-lg">✓</Text>
          </View>
        )}
      </View>

      {/* Forgot Password Link */}
      <TouchableOpacity
        onPress={handleForgotPassword}
        className="mb-6 self-end"
        activeOpacity={0.7}
      >
        <Text className="text-[#F05C0C] text-sm font-medium">
          Forgot password?
        </Text>
      </TouchableOpacity>

      {/* Sign In Button */}
      <Button
        onPress={handleSignIn}
        title={authState.isLoading ? 'Signing In...' : 'Sign In'}
        containerClassName={`w-full h-14 rounded-lg items-center justify-center mb-6 ${
          isFormValid && !authState.isLoading ? 'bg-[#F05C0C]' : 'bg-gray-300'
        }`}
        textClassName={`font-semibold text-base ${
          isFormValid && !authState.isLoading ? 'text-white' : 'text-gray-500'
        }`}
        disabled={!isFormValid || authState.isLoading}
      />

      {/* Error Display */}
      {authState.error && (
        <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <Text className="text-red-700 text-sm text-center">
            {authState.error.message}
          </Text>
        </View>
      )}

      {/* Sign Up Link */}
      <View className="items-center">
        <Text className="text-gray-600 text-sm">
          Don't have an account?{' '}
          <TouchableOpacity onPress={handleSignUp} activeOpacity={0.7}>
            <Text className="text-[#F05C0C] font-medium">Sign up here</Text>
          </TouchableOpacity>
        </Text>
      </View>

      {/* Coming Soon: SSO Options */}
      <View className="mt-8 items-center">
        <Text className="text-gray-400 text-xs mb-3">Coming Soon</Text>
        <View className="flex-row space-x-4">
          <TouchableOpacity
            className="p-3 bg-gray-100 rounded-lg opacity-50"
            disabled
          >
            <Text className="text-2xl">🔗</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-3 bg-gray-100 rounded-lg opacity-50"
            disabled
          >
            <Text className="text-2xl">📧</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CleanSignInForm;
