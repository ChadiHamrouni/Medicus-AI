import { Button } from '@/components/shared/ui';
import { PasswordField } from '@/components/shared/ui/Form';
import { FormField } from '@/components/shared/ui/Form/FormField';
import { SpecialtyDropdown } from '@/components/shared/ui/Form/Dropdown/SpecialtyDropdown';
import { commonValidationRules, useFormValidation } from '@/hooks';
import { useSpecialtiesPublicQuery } from '@/hooks/doctor/queries';
import { getPasswordStrength } from '@/utils/validation';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { UserRole } from '../ui/RoleSelector';
import { PasswordStrengthIndicator } from '../utils';

interface EmailSignUpFormInitialData {
  email?: string;
  password?: string;
  confirmPassword?: string;
  licenseNumber?: string;
  specialtyId?: number;
  specialtyName?: string;
}

interface EmailSignUpFormProps {
  onSubmit: (
    email: string,
    password: string,
    licenseNumber?: string,
    confirmPassword?: string,
    specialtyId?: number
  ) => void;
  onBack: () => void;
  role: UserRole; // to conditionally render license number field for doctors
  isLoading?: boolean;
  initialData?: EmailSignUpFormInitialData;
}

type FormFieldKey =
  | 'email'
  | 'licenseNumber'
  | 'specialty'
  | 'password'
  | 'confirmPassword';

export const EmailSignUpForm: React.FC<EmailSignUpFormProps> = ({
  onSubmit,
  onBack,
  role,
  isLoading = false,
  initialData = {},
}) => {
  const router = useRouter();
  const isDoctor = role === 'doctor';

  const { data: specialtiesData, isLoading: loadingSpecialties } =
    useSpecialtiesPublicQuery();
  const specialties = specialtiesData?.specialties || [];

  const validationRules = useMemo(
    () => ({
      email: commonValidationRules.email,
      // License number required only for doctors; minimal inline rule to avoid broader changes
      licenseNumber: (value: string) => {
        if (!isDoctor) return null;
        if (!value || !value.trim()) return 'License number is required';
        return null;
      },
      specialty: (value: string) => {
        if (!isDoctor) return null;
        if (!value || !value.trim()) return 'Specialty is required';
        return null;
      },
      password: commonValidationRules.password,
      confirmPassword: commonValidationRules.confirmPassword,
    }),
    [isDoctor]
  );

  const { formData, errors, touched, handleInputChange, handleBlur } =
    useFormValidation<FormFieldKey>(
      {
        email: initialData.email || '',
        licenseNumber: initialData.licenseNumber || '',
        specialty: initialData.specialtyName || '',
        password: initialData.password || '',
        confirmPassword: initialData.confirmPassword || '',
      },
      validationRules
    );

  const [selectedSpecialtyId, setSelectedSpecialtyId] = React.useState<
    number | undefined
  >(initialData.specialtyId);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = () => {
    // Validate required fields
    const emailError = validationRules.email(formData.email);
    const licenseError = validationRules.licenseNumber(formData.licenseNumber);
    const specialtyError = validationRules.specialty(formData.specialty);
    const passwordError = validationRules.password(formData.password);
    const confirmPasswordError = validationRules.confirmPassword(
      formData.confirmPassword,
      formData
    );

    if (
      emailError ||
      passwordError ||
      confirmPasswordError ||
      licenseError ||
      specialtyError
    )
      return;

    onSubmit(
      formData.email,
      formData.password,
      isDoctor ? formData.licenseNumber.trim() : undefined,
      formData.confirmPassword,
      isDoctor ? selectedSpecialtyId : undefined
    );
  };

  const isFormValid =
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    (!isDoctor || !!formData.licenseNumber) &&
    (!isDoctor || !!formData.specialty) &&
    (!isDoctor || !!selectedSpecialtyId) &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword &&
    (!isDoctor || !errors.licenseNumber) &&
    (!isDoctor || !errors.specialty) &&
    formData.password === formData.confirmPassword &&
    passwordStrength.text === 'Strong';

  return (
    <View className="w-full max-w-md mx-auto">
      {/* Back button */}
      <View className="mb-6">
        <TouchableOpacity
          onPress={onBack}
          className="flex-row items-center self-start"
          activeOpacity={0.7}
        >
          <Text className="text-[#F05C0C] text-2xl mr-2">←</Text>
          <Text className="text-[#F05C0C] text-base font-medium">Back</Text>
        </TouchableOpacity>
      </View>

      {/* Form title */}
      <Text className="text-2xl font-bold text-gray-900 mb-8">
        Create your account
      </Text>

      {/* Email field */}
      <View className="mb-4">
        <FormField
          type="text"
          field="email"
          value={formData.email}
          label="Email Address"
          placeholder="your.email@example.com"
          error={errors.email}
          touched={touched.email}
          onChangeText={text => handleInputChange('email', text)}
          onBlur={() => handleBlur('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          backgroundColor="white"
        />
        {formData.email && !errors.email && (
          <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Text className="text-green-500 text-lg">✓</Text>
          </View>
        )}
      </View>

      {/* License Number field - only for doctors */}
      {isDoctor && (
        <View className="mb-4">
          <FormField
            type="text"
            field="licenseNumber"
            value={formData.licenseNumber}
            label="License Number"
            placeholder="Enter your medical license number"
            error={errors.licenseNumber}
            touched={touched.licenseNumber}
            onChangeText={text => handleInputChange('licenseNumber', text)}
            onBlur={() => handleBlur('licenseNumber')}
            autoCapitalize="characters"
            backgroundColor="white"
          />
          {formData.licenseNumber && !errors.licenseNumber && (
            <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Text className="text-green-500 text-lg">✓</Text>
            </View>
          )}
        </View>
      )}

      {/* Specialty Dropdown - only for doctors */}
      {isDoctor && (
        <SpecialtyDropdown
          value={formData.specialty}
          specialties={specialties}
          onValueChange={(specialtyName, specialtyId) => {
            handleInputChange('specialty', specialtyName);
            setSelectedSpecialtyId(Number(specialtyId));
          }}
          label="Specialty"
          isLoading={loadingSpecialties}
          error={errors.specialty}
          backgroundColor="white"
        />
      )}

      {/* Password field */}
      <View className="mb-4">
        <PasswordField
          field="password"
          value={formData.password}
          label="Password"
          placeholder="Create a strong password"
          onChangeText={(text: string) => handleInputChange('password', text)}
          onBlur={() => handleBlur('password')}
          error={errors.password}
          touched={touched.password}
          backgroundColor="white"
        />

        {/* Password strength indicator */}
        <PasswordStrengthIndicator password={formData.password} />
      </View>

      {/* Confirm Password field */}
      <View className="mb-6">
        <PasswordField
          field="confirmPassword"
          value={formData.confirmPassword}
          label="Confirm Password"
          placeholder="Re-enter your password"
          onChangeText={(text: string) =>
            handleInputChange('confirmPassword', text)
          }
          onBlur={() => handleBlur('confirmPassword')}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          backgroundColor="white"
        />
        {formData.confirmPassword &&
          !errors.confirmPassword &&
          formData.password === formData.confirmPassword && (
            <View className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <Text className="text-green-500 text-lg">✓</Text>
            </View>
          )}
      </View>

      {/* Continue button */}
      <Button
        onPress={handleSubmit}
        title={isLoading ? 'Processing...' : 'Continue'}
        containerClassName={`w-full h-14 rounded-lg items-center justify-center mb-4 ${
          isFormValid && !isLoading ? 'bg-[#F05C0C]' : 'bg-gray-300'
        }`}
        textClassName={`font-semibold text-base ${
          isFormValid && !isLoading ? 'text-white' : 'text-gray-500'
        }`}
        disabled={!isFormValid || isLoading}
      />

      {/* Terms */}
      <Text className="text-sm text-gray-500 text-center mb-4">
        By continuing, you agree to our{' '}
        <Text className="text-[#F05C0C] underline">Terms of Use</Text> and{' '}
        <Text className="text-[#F05C0C] underline">Privacy Policy</Text>
      </Text>

      {/* Sign In Option */}
      <View className="flex-row justify-center items-center">
        <Text className="text-gray-600">Already have an account?</Text>
        <TouchableOpacity
          className="ml-2"
          onPress={() => router.push('/(SignIn)/SignInScreen')}
        >
          <Text className="text-[#F05C0C] font-semibold">Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EmailSignUpForm;
