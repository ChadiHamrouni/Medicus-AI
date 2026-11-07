import React from 'react';
import { View, Text } from 'react-native';
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import { useFormValidation, useAnimatedFormField } from '@/hooks';

type FormFieldKey =
  | 'specialization'
  | 'yearsOfExperience'
  | 'hospitalAffiliation'
  | 'medicalLicense';

const PracticeInformationForm: React.FC<{
  onFormDataChange: (
    _isValid: boolean,
    _formData: Record<string, string>
  ) => void;
}> = ({ onFormDataChange }) => {
  // Initialize form validation
  const { formData, errors, handleInputChange, validateForm } =
    useFormValidation<FormFieldKey>(
      {
        specialization: '',
        yearsOfExperience: '',
        hospitalAffiliation: '',
        medicalLicense: '',
      },
      {
        specialization: value => (!value ? 'Specialization is required' : null),
        yearsOfExperience: value => {
          if (!value) return 'Years of experience is required';
          if (isNaN(Number(value)) || Number(value) < 0)
            return 'Please enter a valid number';
          return null;
        },
        hospitalAffiliation: value =>
          !value ? 'Hospital affiliation is required' : null,
        medicalLicense: value =>
          !value ? 'Medical license number is required' : null,
      }
    );

  // Define form fields
  const formFields: FormFieldKey[] = [
    'specialization',
    'yearsOfExperience',
    'hospitalAffiliation',
    'medicalLicense',
  ];

  // Setup animated form field hook
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields);

  // Validate form on change
  React.useEffect(() => {
    const isValid = validateForm();
    onFormDataChange(isValid, formData);
  }, [formData, validateForm, onFormDataChange]);

  return (
    <View className="w-full">
      <Text className="text-lg font-semibold text-gray-800 mb-4">
        Practice Information
      </Text>

      {/* Specialization */}
      <View className="mb-4">
        <FormFieldWrapper
          type="text"
          field="specialization"
          value={formData.specialization}
          label="Medical Specialization"
          isActive={selectedInput === 'specialization'}
          borderColor={
            errors.specialization ? '#EF4444' : getBorderColor('specialization')
          }
          labelStyle={getLabelStyle('specialization')}
          onFocus={() => handleFocus('specialization')}
          onBlur={() => handleBlur('specialization')}
          onChangeText={text => handleInputChange('specialization', text)}
          errorMessage={errors.specialization}
        />
      </View>

      {/* Years of Experience */}
      <View className="mb-4">
        <FormFieldWrapper
          type="text"
          field="yearsOfExperience"
          value={formData.yearsOfExperience}
          label="Years of Experience"
          isActive={selectedInput === 'yearsOfExperience'}
          borderColor={
            errors.yearsOfExperience
              ? '#EF4444'
              : getBorderColor('yearsOfExperience')
          }
          labelStyle={getLabelStyle('yearsOfExperience')}
          onFocus={() => handleFocus('yearsOfExperience')}
          onBlur={() => handleBlur('yearsOfExperience')}
          onChangeText={text => handleInputChange('yearsOfExperience', text)}
          keyboardType="numeric"
          errorMessage={errors.yearsOfExperience}
        />
      </View>

      {/* Hospital Affiliation */}
      <View className="mb-4">
        <FormFieldWrapper
          type="text"
          field="hospitalAffiliation"
          value={formData.hospitalAffiliation}
          label="Hospital Affiliation"
          isActive={selectedInput === 'hospitalAffiliation'}
          borderColor={
            errors.hospitalAffiliation
              ? '#EF4444'
              : getBorderColor('hospitalAffiliation')
          }
          labelStyle={getLabelStyle('hospitalAffiliation')}
          onFocus={() => handleFocus('hospitalAffiliation')}
          onBlur={() => handleBlur('hospitalAffiliation')}
          onChangeText={text => handleInputChange('hospitalAffiliation', text)}
          errorMessage={errors.hospitalAffiliation}
        />
      </View>

      {/* Medical License */}
      <View className="mb-4">
        <FormFieldWrapper
          type="text"
          field="medicalLicense"
          value={formData.medicalLicense}
          label="Medical License Number"
          isActive={selectedInput === 'medicalLicense'}
          borderColor={
            errors.medicalLicense ? '#EF4444' : getBorderColor('medicalLicense')
          }
          labelStyle={getLabelStyle('medicalLicense')}
          onFocus={() => handleFocus('medicalLicense')}
          onBlur={() => handleBlur('medicalLicense')}
          onChangeText={text => handleInputChange('medicalLicense', text)}
          errorMessage={errors.medicalLicense}
        />
      </View>
    </View>
  );
};

export default PracticeInformationForm;
