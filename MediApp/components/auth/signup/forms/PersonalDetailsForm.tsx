import { Button } from '@/components/shared/ui';
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import { useAnimatedFormField, useFormValidation } from '@/hooks';
import { genderOptions } from '@/utils';
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface PersonalDetailsFormProps {
  onSubmit: (_details: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  }) => void;
  onBack: (data: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  }) => void;
  isLoading?: boolean;
  initialData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  };
}

type FormFieldKey = 'firstName' | 'lastName' | 'dateOfBirth' | 'gender';

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  onSubmit,
  onBack,
  isLoading = false,
  initialData = {},
}) => {
  const validationRules = useMemo(
    () => ({
      firstName: (value: string) =>
        value?.trim() ? null : 'First name is required',
      lastName: (value: string) =>
        value?.trim() ? null : 'Last name is required',
      dateOfBirth: (value: string) => {
        if (!value) return 'Date of birth is required';
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 13) return 'You must be at least 13 years old';
        if (age > 120) return 'Please enter a valid date of birth';
        return null;
      },
      gender: (value: string) => (value ? null : 'Please select your gender'),
    }),
    []
  );

  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    setErrors,
    setTouched,
  } = useFormValidation<FormFieldKey>(
    {
      firstName: initialData.firstName || '',
      lastName: initialData.lastName || '',
      dateOfBirth: initialData.dateOfBirth || '',
      gender: initialData.gender || '',
    },
    validationRules
  );

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(
    ['firstName', 'lastName', 'dateOfBirth', 'gender'],
    'white'
  );

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onSubmit({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
    });
  };

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.dateOfBirth &&
    formData.gender &&
    !errors.firstName &&
    !errors.lastName &&
    !errors.dateOfBirth &&
    !errors.gender;

  return (
    <View className="w-full max-w-md mx-auto py-6">
      {/* Back button */}
      <View className="mb-6">
        <TouchableOpacity
          onPress={() => onBack(formData)}
          className="flex-row items-center self-start"
          activeOpacity={0.7}
        >
          <Text className="text-[#F05C0C] text-2xl mr-2">←</Text>
          <Text className="text-[#F05C0C] text-base font-medium">Back</Text>
        </TouchableOpacity>
      </View>

      {/* Form title */}
      {/* <Text className="text-2xl font-bold text-gray-900 mb-2">
        Personal details
      </Text>
      <Text className="text-base text-gray-600 mb-6">
        Help us personalize your experience
      </Text> */}

      {/* First Name */}
      <View className="my-4">
        <FormFieldWrapper
          type="text"
          field="firstName"
          value={formData.firstName}
          label="First Name"
          placeholder="Enter your first name"
          isActive={selectedInput === 'firstName'}
          borderColor={
            errors.firstName ? '#EF4444' : getBorderColor('firstName')
          }
          labelStyle={getLabelStyle('firstName')}
          onFocus={() => handleFocus('firstName')}
          onBlur={() => handleBlur('firstName')}
          onChangeText={text => handleInputChange('firstName', text)}
          autoCapitalize="words"
          errorMessage={errors.firstName}
        />
        {formData.firstName.trim() && !errors.firstName && (
          <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Text className="text-green-500 text-lg">✓</Text>
          </View>
        )}
      </View>

      {/* Last Name */}
      <View className="mb-4">
        <FormFieldWrapper
          type="text"
          field="lastName"
          value={formData.lastName}
          label="Last Name"
          placeholder="Enter your last name"
          isActive={selectedInput === 'lastName'}
          borderColor={errors.lastName ? '#EF4444' : getBorderColor('lastName')}
          labelStyle={getLabelStyle('lastName')}
          onFocus={() => handleFocus('lastName')}
          onBlur={() => handleBlur('lastName')}
          onChangeText={text => handleInputChange('lastName', text)}
          autoCapitalize="words"
          errorMessage={errors.lastName}
        />
        {formData.lastName.trim() && !errors.lastName && (
          <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Text className="text-green-500 text-lg">✓</Text>
          </View>
        )}
      </View>

      {/* Date of Birth */}
      <View className="mb-4">
        <FormFieldWrapper
          type="date"
          field="dateOfBirth"
          value={formData.dateOfBirth}
          label="Date of Birth"
          isActive={selectedInput === 'dateOfBirth'}
          borderColor={
            errors.dateOfBirth ? '#EF4444' : getBorderColor('dateOfBirth')
          }
          labelStyle={getLabelStyle('dateOfBirth')}
          onFocus={() => handleFocus('dateOfBirth')}
          onBlur={() => handleBlur('dateOfBirth')}
          onChange={dateString => handleInputChange('dateOfBirth', dateString)}
          errorMessage={errors.dateOfBirth}
          dateFormat="full"
        />
        {formData.dateOfBirth && !errors.dateOfBirth && (
          <View className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <Text className="text-green-500 text-lg">✓</Text>
          </View>
        )}
      </View>

      {/* Gender Selection */}
      <View className="mb-6">
        <FormFieldWrapper
          type="singleDropdown"
          field="gender"
          value={formData.gender}
          label="Gender"
          options={genderOptions.map(option => ({
            key: option.value,
            value: option.label,
          }))}
          isActive={selectedInput === 'gender'}
          borderColor={errors.gender ? '#EF4444' : getBorderColor('gender')}
          labelStyle={getLabelStyle('gender')}
          onFocus={() => handleFocus('gender')}
          onBlur={() => handleBlur('gender')}
          onValueChange={value => handleInputChange('gender', value)}
          errorMessage={errors.gender}
          searchable={false}
          backgroundColor="white"
        />
        {formData.gender && !errors.gender && (
          <View
            style={{
              position: 'absolute',
              right: 64,
              top: 18,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text className="text-green-500 text-lg">✓</Text>
          </View>
        )}
      </View>

      {/* Continue button */}
      <Button
        onPress={handleSubmit}
        title={isLoading ? 'Creating Account...' : 'Create Account'}
        containerClassName={`w-full h-14 rounded-lg items-center justify-center mb-4 ${isFormValid && !isLoading ? 'bg-[#F05C0C]' : 'bg-gray-300'
          }`}
        textClassName={`font-semibold text-base ${isFormValid && !isLoading ? 'text-white' : 'text-gray-500'
          }`}
        disabled={!isFormValid || isLoading}
      />
    </View>
  );
};

export default PersonalDetailsForm;
