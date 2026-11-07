import {
  Button,
  FormFieldWrapper,
  UnifiedDropdown,
  transformStringArrayOptions,
} from '@/components/shared/ui';
import { useFormValidation, useAnimatedFormField } from '@/hooks';
import { INSURANCE_PROVIDERS, LANGUAGES } from '@/constants/Doctor';
import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface PatientAdditionalInfoData {
  insuranceProvider?: string;
  insuranceId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  chronicConditions?: string;
  medications?: string;
  allergies?: string;
  preferredLanguage?: string;
}

interface PatientAdditionalInfoFormProps {
  onSubmit: (data: PatientAdditionalInfoData) => void;
  onBack: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

type FormFieldKey = keyof PatientAdditionalInfoData;

export const PatientAdditionalInfoForm: React.FC<
  PatientAdditionalInfoFormProps
> = ({ onSubmit, onBack, onSkip, isLoading = false }) => {
  const validationRules = useMemo(
    () => ({
      insuranceProvider: () => null, // All fields optional
      insuranceId: () => null,
      emergencyContact: () => null,
      emergencyPhone: () => null,
      chronicConditions: () => null,
      medications: () => null,
      allergies: () => null,
      preferredLanguage: () => null,
    }),
    []
  );

  const { formData, handleInputChange } = useFormValidation<FormFieldKey>(
    {
      insuranceProvider: '',
      insuranceId: '',
      emergencyContact: '',
      emergencyPhone: '',
      chronicConditions: '',
      medications: '',
      allergies: '',
      preferredLanguage: '',
    },
    validationRules
  );

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField([
    'insuranceProvider',
    'insuranceId',
    'emergencyContact',
    'emergencyPhone',
    'chronicConditions',
    'medications',
    'allergies',
    'preferredLanguage',
  ]);

  const handleSubmit = () => {
    // Filter out empty values
    const cleanData: PatientAdditionalInfoData = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value && value.trim()) {
        cleanData[key as FormFieldKey] = value.trim();
      }
    });

    onSubmit(cleanData);
  };

  const hasData = Object.values(formData).some(value => value && value.trim());

  return (
    <ScrollView className="flex-1">
      <View className="w-full max-w-md mx-auto px-4 py-6">
        {/* Back button */}
        <TouchableOpacity
          onPress={onBack}
          className="flex-row items-center mb-6"
          activeOpacity={0.7}
        >
          <Text className="text-[#F05C0C] text-2xl mr-2">←</Text>
          <Text className="text-[#F05C0C] text-base font-medium">Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Additional Information
          </Text>
          <Text className="text-base text-gray-600 mb-4">
            Help us provide better care by sharing some optional details
          </Text>
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Text className="text-blue-700 text-sm">
              ℹ️ All fields are optional. You can skip this step and add
              information later in your profile settings.
            </Text>
          </View>
        </View>

        {/* Insurance Information */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Insurance Information
          </Text>

          <View className="mb-4">
            <UnifiedDropdown
              value={formData.insuranceProvider || ''}
              onValueChange={value => {
                if (typeof value === 'string') {
                  handleInputChange('insuranceProvider', value);
                }
              }}
              options={transformStringArrayOptions(INSURANCE_PROVIDERS)}
              label="Insurance Provider"
              placeholder="Select your insurance provider"
              isActive={selectedInput === 'insuranceProvider'}
              borderColor={getBorderColor('insuranceProvider')}
              labelStyle={getLabelStyle('insuranceProvider')}
              onFocus={() => handleFocus('insuranceProvider')}
              onBlur={() => handleBlur('insuranceProvider')}
              searchable={true}
              clearable={true}
              modalType="bottom-sheet"
            />
          </View>

          <View className="mb-6">
            <FormFieldWrapper
              type="text"
              field="insuranceId"
              value={formData.insuranceId || ''}
              label="Insurance Member ID"
              placeholder="Enter your member ID"
              onChangeText={text => handleInputChange('insuranceId', text)}
              isActive={selectedInput === 'insuranceId'}
              borderColor={getBorderColor('insuranceId')}
              labelStyle={getLabelStyle('insuranceId')}
              onFocus={() => handleFocus('insuranceId')}
              onBlur={() => handleBlur('insuranceId')}
            />
          </View>
        </View>

        {/* Emergency Contact */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Emergency Contact
          </Text>

          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="emergencyContact"
              value={formData.emergencyContact || ''}
              label="Emergency Contact Name"
              placeholder="Full name of emergency contact"
              onChangeText={text => handleInputChange('emergencyContact', text)}
              isActive={selectedInput === 'emergencyContact'}
              borderColor={getBorderColor('emergencyContact')}
              labelStyle={getLabelStyle('emergencyContact')}
              onFocus={() => handleFocus('emergencyContact')}
              onBlur={() => handleBlur('emergencyContact')}
              autoCapitalize="words"
            />
          </View>

          <View className="mb-6">
            <FormFieldWrapper
              type="text"
              field="emergencyPhone"
              value={formData.emergencyPhone || ''}
              label="Emergency Contact Phone"
              placeholder="Phone number"
              onChangeText={text => handleInputChange('emergencyPhone', text)}
              keyboardType="phone-pad"
              isActive={selectedInput === 'emergencyPhone'}
              borderColor={getBorderColor('emergencyPhone')}
              labelStyle={getLabelStyle('emergencyPhone')}
              onFocus={() => handleFocus('emergencyPhone')}
              onBlur={() => handleBlur('emergencyPhone')}
            />
          </View>
        </View>

        {/* Medical Information */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Medical Information
          </Text>

          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="chronicConditions"
              value={formData.chronicConditions || ''}
              label="Chronic Conditions"
              placeholder="List any chronic conditions (e.g., diabetes, hypertension)"
              onChangeText={text =>
                handleInputChange('chronicConditions', text)
              }
              isActive={selectedInput === 'chronicConditions'}
              borderColor={getBorderColor('chronicConditions')}
              labelStyle={getLabelStyle('chronicConditions')}
              onFocus={() => handleFocus('chronicConditions')}
              onBlur={() => handleBlur('chronicConditions')}
              multiline={true}
            />
          </View>

          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="medications"
              value={formData.medications || ''}
              label="Current Medications"
              placeholder="List current medications and dosages"
              onChangeText={text => handleInputChange('medications', text)}
              isActive={selectedInput === 'medications'}
              borderColor={getBorderColor('medications')}
              labelStyle={getLabelStyle('medications')}
              onFocus={() => handleFocus('medications')}
              onBlur={() => handleBlur('medications')}
              multiline={true}
            />
          </View>

          <View className="mb-6">
            <FormFieldWrapper
              type="text"
              field="allergies"
              value={formData.allergies || ''}
              label="Allergies"
              placeholder="List any allergies (medications, foods, environmental)"
              onChangeText={text => handleInputChange('allergies', text)}
              isActive={selectedInput === 'allergies'}
              borderColor={getBorderColor('allergies')}
              labelStyle={getLabelStyle('allergies')}
              onFocus={() => handleFocus('allergies')}
              onBlur={() => handleBlur('allergies')}
              multiline={true}
            />
          </View>
        </View>

        {/* Preferences */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Preferences
          </Text>

          <View className="mb-6">
            <UnifiedDropdown
              value={formData.preferredLanguage || ''}
              onValueChange={value => {
                if (typeof value === 'string') {
                  handleInputChange('preferredLanguage', value);
                }
              }}
              options={transformStringArrayOptions(LANGUAGES)}
              label="Preferred Language"
              placeholder="Select your preferred language"
              isActive={selectedInput === 'preferredLanguage'}
              borderColor={getBorderColor('preferredLanguage')}
              labelStyle={getLabelStyle('preferredLanguage')}
              onFocus={() => handleFocus('preferredLanguage')}
              onBlur={() => handleBlur('preferredLanguage')}
              searchable={true}
              clearable={true}
              modalType="bottom-sheet"
            />
          </View>
        </View>

        {/* Buttons */}
        <View className="space-y-3">
          <Button
            onPress={handleSubmit}
            title={
              isLoading
                ? 'Saving...'
                : hasData
                  ? 'Save Information'
                  : 'Continue Without Adding'
            }
            containerClassName={`w-full h-14 rounded-lg items-center justify-center ${
              !isLoading ? 'bg-[#F05C0C]' : 'bg-gray-300'
            }`}
            textClassName={`font-semibold text-base ${
              !isLoading ? 'text-white' : 'text-gray-500'
            }`}
            disabled={isLoading}
          />

          <TouchableOpacity
            onPress={onSkip}
            className="w-full h-12 items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-600 text-base">
              Skip for now (add later in settings)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default PatientAdditionalInfoForm;
