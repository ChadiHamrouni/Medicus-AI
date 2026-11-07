import { Button } from '@/components/shared/ui';
import { PasswordField } from '@/components/shared/ui/Form';
import { FormField } from '@/components/shared/ui/Form/FormField';
import { SpecialtyDropdown } from '@/components/shared/ui/Form/Dropdown/SpecialtyDropdown';
import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';
import { commonValidationRules, useFormValidation } from '@/hooks';
import { useSpecialtiesPublicQuery } from '@/hooks/doctor/queries';
import { formatPhoneNumber } from '@/utils';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { PasswordRequirements } from './PasswordRequirements';

interface PhoneSignUpFormInitialData {
  phone?: string;
  countryCode?: string;
  password?: string;
  confirmPassword?: string;
  licenseNumber?: string;
  specialtyId?: number;
  specialtyName?: string;
}

interface PhoneSignUpFormProps {
  onSubmit: (
    phoneNumber: string,
    countryCode: string,
    password: string,
    licenseNumber?: string,
    confirmPassword?: string,
    specialtyId?: number
  ) => void;
  onBack: () => void;
  role?: 'patient' | 'doctor';
  isLoading?: boolean;
  initialData?: PhoneSignUpFormInitialData;
}

type FormData = {
  phoneNumber: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
  licenseNumber: string;
  specialty: string;
};

export const PhoneSignUpForm: React.FC<PhoneSignUpFormProps> = ({
  onSubmit,
  onBack,
  role = 'patient',
  isLoading = false,
  initialData = {},
}) => {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState(
    initialData.countryCode
      ? countryCodes.find(c => c.code === initialData.countryCode) ||
      countryCodes[0]
      : countryCodes.find(c => c.code === 'US') || countryCodes[0]
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const isDoctor = role === 'doctor';

  const { data: specialtiesData, isLoading: loadingSpecialties } =
    useSpecialtiesPublicQuery();
  const specialties = specialtiesData?.specialties || [];

  const validationRules = useMemo(
    () => ({
      phoneNumber: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Phone number is required';
        }
        // Validate based on selected country's digit requirement
        const cleaned = value.replace(/\D/g, '');
        const mask = selectedCountry.mask;
        const requiredDigits = mask ? (mask.match(/#/g) || []).length : 10;

        if (cleaned.length < requiredDigits) {
          return `Phone number must be ${requiredDigits} digits for ${selectedCountry.name}`;
        }
        return null;
      },
      countryCode: () => null, // No validation needed for country code
      password: commonValidationRules.password,
      confirmPassword: commonValidationRules.confirmPassword,
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
    }),
    [selectedCountry, isDoctor]
  );

  const {
    formData,
    errors,
    touched,
    handleInputChange,
    handleBlur,
    setFormData,
  } = useFormValidation<keyof FormData>(
    {
      phoneNumber: initialData.phone || '',
      countryCode: initialData.countryCode || selectedCountry.code,
      password: initialData.password || '',
      confirmPassword: initialData.confirmPassword || '',
      licenseNumber: initialData.licenseNumber || '',
      specialty: initialData.specialtyName || '',
    },
    validationRules
  );

  const [selectedSpecialtyId, setSelectedSpecialtyId] = React.useState<
    number | undefined
  >(initialData.specialtyId);

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value, selectedCountry.code);
    handleInputChange('phoneNumber', formatted);
  };

  const handleCountrySelect = (country: (typeof countryCodes)[0]) => {
    setSelectedCountry(country);
    setFormData(prev => ({ ...prev, countryCode: country.code }));
    setShowCountryPicker(false);
  };

  const handleSubmit = () => {
    // Validate all fields
    const phoneError = validationRules.phoneNumber(formData.phoneNumber);
    const passwordError = validationRules.password(formData.password);
    const confirmPasswordError = validationRules.confirmPassword(
      formData.confirmPassword,
      formData
    );
    const licenseError = validationRules.licenseNumber(formData.licenseNumber);
    const specialtyError = validationRules.specialty(formData.specialty);

    if (
      phoneError ||
      passwordError ||
      confirmPasswordError ||
      licenseError ||
      specialtyError
    )
      return;

    // Extract clean phone number and format according to database constraint
    // Database expects: digits, parentheses, spaces, hyphens only (NO plus sign)
    const cleanPhoneNumber = formData.phoneNumber.replace(/\D/g, '');

    // Store just the phone number without country code to match backend expectation
    // Backend stores raw phone numbers like "3334445556", not with country codes
    const formattedPhoneNumber = cleanPhoneNumber;

    onSubmit(
      formattedPhoneNumber,
      selectedCountry.code,
      formData.password,
      isDoctor ? formData.licenseNumber.trim() : undefined,
      formData.confirmPassword,
      isDoctor ? selectedSpecialtyId : undefined
    );
  };

  const getPasswordStrength = (
    password: string
  ): { score: number; text: string; color: string } => {
    if (!password) return { score: 0, text: '', color: '' };

    let score = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^a-zA-Z0-9]/.test(password),
    ];

    score = checks.filter(check => check).length;

    if (score < 2) return { score: 1, text: 'Weak', color: '#EF4444' };
    if (score < 4) return { score: 2, text: 'Fair', color: '#F59E0B' };
    if (score < 5) return { score: 3, text: 'Good', color: '#10B981' };
    return { score: 4, text: 'Strong', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const getRequiredDigitsForCountry = () => {
    const mask = selectedCountry.mask;
    return mask ? (mask.match(/#/g) || []).length : 10; // Default to 10 if no mask
  };

  const isFormValid =
    formData.phoneNumber.replace(/\D/g, '').length >=
    getRequiredDigitsForCountry() &&
    formData.password &&
    formData.confirmPassword &&
    (!isDoctor || !!formData.licenseNumber) &&
    (!isDoctor || !!formData.specialty) &&
    (!isDoctor || !!selectedSpecialtyId) &&
    !errors.phoneNumber &&
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
      <Text className="text-2xl font-normal text-gray-900 mb-2">
        Create your account
      </Text>
      <Text className="text-base text-gray-600"></Text>

      {/* Country selector */}
      <TouchableOpacity
        className="w-full h-14 px-4 border-2 border-gray-200 rounded-lg flex-row items-center justify-between mb-4"
        onPress={() => setShowCountryPicker(!showCountryPicker)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <Text className="text-2xl mr-2">{selectedCountry.flag}</Text>
          <Text className="text-base text-gray-900 font-medium">
            {selectedCountry.name}
          </Text>
          <Text className="text-base text-gray-600 ml-2">
            {selectedCountry.dial_code}
          </Text>
        </View>
        <Text className="text-gray-400 text-lg">
          {showCountryPicker ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Country picker dropdown */}
      {showCountryPicker && (
        <View className="w-full max-h-48 border border-gray-200 rounded-lg bg-white mb-4 overflow-hidden">
          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {countryCodes.map(country => (
              <TouchableOpacity
                key={country.code}
                className="flex-row items-center px-4 py-3 border-b border-gray-100"
                onPress={() => handleCountrySelect(country)}
                activeOpacity={0.7}
              >
                <Text className="text-xl mr-3">{country.flag}</Text>
                <Text className="flex-1 text-base text-gray-900">
                  {country.name}
                </Text>
                <Text className="text-base text-gray-600">
                  {country.dial_code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Phone number input */}
      <View className="mb-4">
        <FormField
          type="text"
          field="phoneNumber"
          value={formData.phoneNumber}
          label="Phone Number"
          placeholder={
            selectedCountry.mask
              ? selectedCountry.mask.replace(/#/g, '0')
              : 'Enter phone number'
          }
          onChangeText={handlePhoneChange}
          onBlur={() => handleBlur('phoneNumber')}
          keyboardType="phone-pad"
          error={errors.phoneNumber}
          touched={touched.phoneNumber}
          backgroundColor="white"
        />
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
            onChangeText={text => handleInputChange('licenseNumber', text)}
            onBlur={() => handleBlur('licenseNumber')}
            autoCapitalize="characters"
            error={errors.licenseNumber}
            touched={touched.licenseNumber}
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
        {formData.password && (
          <>
            <View className="mt-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-600">Password strength</Text>
                <Text
                  className={`text-sm font-medium`}
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.text}
                </Text>
              </View>
              <View className="flex-row space-x-1">
                {[1, 2, 3, 4].map(level => (
                  <View
                    key={level}
                    className="h-1 flex-1 rounded-full"
                    style={{
                      backgroundColor:
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : '#E5E7EB',
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Password Requirements */}
            <PasswordRequirements password={formData.password} />
          </>
        )}
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
        containerClassName={`w-full h-14 rounded-lg items-center justify-center mb-4 ${isFormValid && !isLoading ? 'bg-[#F05C0C]' : 'bg-gray-300'
          }`}
        textClassName={`font-semibold text-base ${isFormValid && !isLoading ? 'text-white' : 'text-gray-500'
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

export default PhoneSignUpForm;
