import { CustomModal } from '@/components/shared/ui';
import { useModal } from '@/hooks';
import {
  useRegisterMutation,
  useSendVerificationCodeMutation,
} from '@/hooks/auth/mutations';
import { UserRole as AuthUserRole } from '@/types/auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

import { EmailSignUpForm } from './EmailSignUpForm';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import { PhoneSignUpForm } from './PhoneSignUpForm';
import { SignUpMethodSelector, SignUpMethod } from '../ui/SignUpMethodSelector';
import { RoleSelector, UserRole } from '../ui/RoleSelector';
import { logger } from '@/utils';

type SignUpStep = 'method' | 'role' | 'contact' | 'personal';

interface SignUpData {
  method: SignUpMethod | null;
  role: UserRole;
  // Contact info
  phone?: string;
  countryCode?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  licenseNumber?: string; // doctor-only
  specialtyId?: number; // doctor-only
  specialtyName?: string; // doctor-only
  // Personal details
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
}

interface NewSignUpFormProps {
  initialRole?: 'patient' | 'doctor';
}

export const NewSignUpForm: React.FC<NewSignUpFormProps> = ({
  initialRole = 'patient',
}) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SignUpStep>('method');
  const [signUpData, setSignUpData] = useState<SignUpData>({
    method: null,
    role: initialRole, // Use the role from role selection screen
  });
  const [isLoading, setIsLoading] = useState(false);

  const { modalProps, showModal, hideModal } = useModal();
  const registerMutation = useRegisterMutation();
  const sendVerificationCodeMutation = useSendVerificationCodeMutation();

  const handleMethodSelect = (method: SignUpMethod) => {
    setSignUpData(prev => ({ ...prev, method }));

    if (method === 'google' || method === 'apple') {
      handleSSOSignUp(method);
    } else {
      // Skip role selection since it's already been chosen
      setCurrentStep('contact');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSignUpData(prev => ({ ...prev, role }));
    setCurrentStep('contact');
  };

  const handlePhoneSubmit = async (
    phoneNumber: string,
    countryCode: string,
    password: string,
    licenseNumber?: string,
    confirmPassword?: string,
    specialtyId?: number,
    specialtyName?: string
  ) => {
    setSignUpData(prev => ({
      ...prev,
      phone: phoneNumber,
      countryCode: countryCode,
      password: password,
      confirmPassword: confirmPassword,
      licenseNumber:
        licenseNumber !== undefined ? licenseNumber : prev.licenseNumber,
      specialtyId: specialtyId !== undefined ? specialtyId : prev.specialtyId,
      specialtyName:
        specialtyName !== undefined ? specialtyName : prev.specialtyName,
    }));
    setCurrentStep('personal');
  };

  const handleEmailSubmit = async (
    email: string,
    password: string,
    licenseNumber?: string,
    confirmPassword?: string,
    specialtyId?: number,
    specialtyName?: string
  ) => {
    setSignUpData(prev => ({
      ...prev,
      email: email.trim().toLowerCase(),
      password,
      confirmPassword: confirmPassword,
      licenseNumber:
        licenseNumber !== undefined ? licenseNumber : prev.licenseNumber,
      specialtyId: specialtyId !== undefined ? specialtyId : prev.specialtyId,
      specialtyName:
        specialtyName !== undefined ? specialtyName : prev.specialtyName,
    }));
    setCurrentStep('personal');
  };

  const handleSSOSignUp = (method: SignUpMethod) => {
    showModal(
      'info',
      'Coming Soon',
      `${method === 'google' ? 'Google' : 'Apple'} sign-in will be available soon!`
    );
  };

  const handlePersonalDetailsSubmit = async (details: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  }) => {
    setIsLoading(true);
    try {
      // Combine all signup data
      const completeSignUpData = {
        ...signUpData,
        ...details,
      };

      // Create registration request based on signup method
      let registrationData: any;

      if (signUpData.method === 'phone') {
        // Phone-based registration - no email required
        registrationData = {
          first_name: details.firstName.trim(),
          last_name: details.lastName.trim(),
          phone_number: completeSignUpData.phone,
          dob: details.dateOfBirth,
          gender: details.gender,
          role:
            signUpData.role === 'doctor'
              ? AuthUserRole.DOCTOR
              : AuthUserRole.PATIENT,
          password: completeSignUpData.password!, // Use the actual password they entered
          // Only include doctor-specific fields if doctor selected
          ...(signUpData.role === 'doctor' && completeSignUpData.licenseNumber
            ? { medical_licence: completeSignUpData.licenseNumber }
            : {}),
          ...(signUpData.role === 'doctor' && completeSignUpData.specialtyId
            ? { specialty_id: completeSignUpData.specialtyId }
            : {}),
        };
      } else {
        // Email-based registration
        registrationData = {
          email: completeSignUpData.email!,
          password: completeSignUpData.password!,
          first_name: details.firstName.trim(),
          last_name: details.lastName.trim(),
          phone_number: completeSignUpData.phone, // Optional for email users
          dob: details.dateOfBirth,
          gender: details.gender,
          role:
            signUpData.role === 'doctor'
              ? AuthUserRole.DOCTOR
              : AuthUserRole.PATIENT,
          // Only include doctor-specific fields if doctor selected
          ...(signUpData.role === 'doctor' && completeSignUpData.licenseNumber
            ? { medical_licence: completeSignUpData.licenseNumber }
            : {}),
          ...(signUpData.role === 'doctor' && completeSignUpData.specialtyId
            ? { specialty_id: completeSignUpData.specialtyId }
            : {}),
        };
      }

      // Register the user
      await registerMutation.mutateAsync(registrationData);

      // Send verification code only for email signups
      if (signUpData.method === 'email' && completeSignUpData.email) {
        try {
          await sendVerificationCodeMutation.mutateAsync({
            email: completeSignUpData.email,
          });
        } catch (verificationError) {
          logger.warn('Failed to send verification email', {
            component: 'NewSignUpForm',
            email: completeSignUpData.email,
            error: verificationError,
          });
        }
      }

      const isEmailSignup = signUpData.method === 'email';

      if (isEmailSignup && completeSignUpData.email) {
        router.push({
          pathname: '/(SignUp)/VerificationScreen' as const,
          params: {
            email: completeSignUpData.email,
            role: signUpData.role,
            type: 'email',
          },
        });
      } else {
        router.push({
          pathname: '/(SignIn)/SignInScreen' as const,
          params: {
            accountCreated: 'true',
            message:
              'Your account has been created successfully. You can now sign in with your credentials.',
          },
        });
      }
    } catch (error: any) {
      setIsLoading(false);

      const errorDetails = parseRegistrationError(error);

      showModal(
        'error',
        errorDetails.title,
        errorDetails.message,
        hideModal,
        errorDetails.action,
        errorDetails.actionText
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Parse registration errors and return user-friendly messages with actionable solutions
   */
  const parseRegistrationError = (error: any) => {
    const statusCode =
      error?.status || error?.statusCode || error?.response?.status;
    const backendMessage = error.message || '';

    // Helper function to format backend error message
    const formatBackendMessage = (message: string): string => {
      if (!message) return '';

      let formatted = message.charAt(0).toUpperCase() + message.slice(1);

      if (
        !formatted.endsWith('.') &&
        !formatted.endsWith('!') &&
        !formatted.endsWith('?')
      ) {
        formatted += '.';
      }

      return formatted;
    };

    // Check for 409 Conflict - User already exists
    if (statusCode === 409) {
      const formattedMessage = formatBackendMessage(backendMessage);
      const additionalHelp =
        '\n\nPlease use different details or sign in if you already have an account.';

      return {
        title: 'Already Registered',
        message: additionalHelp,
        actionText: 'Try Again',
        action: () => {
          hideModal();
          setCurrentStep('contact');
        },
      };
    }

    // Default fallback error for all other cases
    // const formattedMessage = formatBackendMessage(backendMessage);
    const fallbackMessage =
      'We encountered an error while creating your account. Please check your information and try again.';

    return {
      title: 'Registration Failed',
      message: fallbackMessage,
      actionText: 'Try Again',
      action: () => hideModal(),
    };
  };

  const handlePersonalDetailsBack = (details: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  }) => {
    setSignUpData(prev => ({
      ...prev,
      ...details,
    }));
    setCurrentStep('contact');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'role':
        setCurrentStep('method');
        break;
      case 'contact':
        // Go back to method selection step
        setCurrentStep('method');
        break;
      case 'personal':
        setCurrentStep('contact');
        break;
      default:
        break;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'method':
        return (
          <SignUpMethodSelector
            selectedMethod={signUpData.method}
            onMethodSelect={handleMethodSelect}
          />
        );

      case 'role':
        return (
          <View className="w-full">
            <RoleSelector
              selectedRole={signUpData.role}
              onRoleChange={handleRoleSelect}
            />
            {/* Continue button for role */}
            <View className="mt-6">
              <TouchableOpacity
                onPress={() => setCurrentStep('contact')}
                className="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center"
                disabled={!signUpData.role}
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-base">
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'contact':
        if (signUpData.method === 'phone') {
          return (
            <PhoneSignUpForm
              onSubmit={handlePhoneSubmit}
              onBack={handleBack}
              role={signUpData.role}
              isLoading={isLoading}
              initialData={{
                phone: signUpData.phone,
                countryCode: signUpData.countryCode,
                password: signUpData.password,
                confirmPassword: signUpData.confirmPassword,
                licenseNumber: signUpData.licenseNumber,
                specialtyId: signUpData.specialtyId,
                specialtyName: signUpData.specialtyName,
              }}
            />
          );
        } else {
          return (
            <EmailSignUpForm
              onSubmit={handleEmailSubmit}
              onBack={handleBack}
              role={signUpData.role}
              isLoading={isLoading}
              initialData={{
                email: signUpData.email,
                password: signUpData.password,
                confirmPassword: signUpData.confirmPassword,
                licenseNumber: signUpData.licenseNumber,
                specialtyId: signUpData.specialtyId,
                specialtyName: signUpData.specialtyName,
              }}
            />
          );
        }

      case 'personal':
        return (
          <PersonalDetailsForm
            onSubmit={handlePersonalDetailsSubmit}
            onBack={handlePersonalDetailsBack}
            isLoading={isLoading}
            initialData={{
              firstName: signUpData.firstName,
              lastName: signUpData.lastName,
              dateOfBirth: signUpData.dateOfBirth,
              gender: signUpData.gender,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View className="w-full max-w-md mx-auto px-4 pb-6">
      <CustomModal {...modalProps} />
      {renderCurrentStep()}
    </View>
  );
};

export default NewSignUpForm;
