import {
  Button,
  FormFieldWrapper,
  UnifiedDropdown,
  transformStringArrayOptions,
} from '@/components/shared/ui';
import { useFormValidation, useAnimatedFormField } from '@/hooks';
import { SPECIALTIES, COUNTRIES, EXPERIENCE_OPTIONS } from '@/constants/Doctor';
import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface DoctorProfileData {
  licenseNumber: string;
  specialty: string;
  countryOfPractice: string;
  medicalSchool?: string;
  yearsOfExperience?: string;
  boardCertifications?: string;
  languages?: string;
  credentials?: any; // File object
}

interface DoctorProfileSetupFormProps {
  onSubmit: (data: DoctorProfileData) => void;
  onBack: () => void;
  isLoading?: boolean;
}

type FormFieldKey = keyof DoctorProfileData;

export const DoctorProfileSetupForm: React.FC<DoctorProfileSetupFormProps> = ({
  onSubmit,
  onBack,
  isLoading = false,
}) => {
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const validationRules = useMemo(
    () => ({
      licenseNumber: (value: string) =>
        value?.trim() ? null : 'Medical license number is required',
      specialty: (value: string) =>
        value ? null : 'Please select your specialty',
      countryOfPractice: (value: string) =>
        value ? null : 'Please select your country of practice',
      medicalSchool: () => null, // Optional
      yearsOfExperience: () => null, // Optional
      boardCertifications: () => null, // Optional
      languages: () => null, // Optional
      credentials: () => null, // Optional
    }),
    []
  );

  const { formData, errors, handleInputChange } =
    useFormValidation<FormFieldKey>(
      {
        licenseNumber: '',
        specialty: '',
        countryOfPractice: '',
        medicalSchool: '',
        yearsOfExperience: '',
        boardCertifications: '',
        languages: '',
        credentials: '',
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
    'licenseNumber',
    'specialty',
    'countryOfPractice',
    'medicalSchool',
    'yearsOfExperience',
    'boardCertifications',
    'languages',
  ]);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setUploadedFile(file);
        Alert.alert('Success', 'Credentials uploaded successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    const licenseError = validationRules.licenseNumber(
      formData.licenseNumber || ''
    );
    const specialtyError = validationRules.specialty(formData.specialty || '');
    const countryError = validationRules.countryOfPractice(
      formData.countryOfPractice || ''
    );

    if (licenseError || specialtyError || countryError) {
      return;
    }

    const completeData: DoctorProfileData = {
      ...formData,
      credentials: uploadedFile,
    };

    onSubmit(completeData);
  };

  const isFormValid =
    formData.licenseNumber?.trim() &&
    formData.specialty &&
    formData.countryOfPractice &&
    !errors.licenseNumber &&
    !errors.specialty &&
    !errors.countryOfPractice;

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
            Complete Your Doctor Profile
          </Text>
          <Text className="text-base text-gray-600">
            Help us verify your credentials and set up your professional profile
          </Text>
        </View>

        {/* Required Fields Section */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Required Information
          </Text>

          {/* License Number */}
          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="licenseNumber"
              value={formData.licenseNumber || ''}
              label="Medical License Number *"
              placeholder="Enter your license number"
              onChangeText={text => handleInputChange('licenseNumber', text)}
              errorMessage={errors.licenseNumber}
              isActive={false}
              borderColor={errors.licenseNumber ? '#EF4444' : '#D1D5DB'}
              labelStyle={{}}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </View>

          {/* Specialty */}
          <View className="mb-4">
            <UnifiedDropdown
              value={formData.specialty || ''}
              onValueChange={value => {
                if (typeof value === 'string') {
                  handleInputChange('specialty', value);
                }
              }}
              options={transformStringArrayOptions(SPECIALTIES)}
              label="Medical Specialty *"
              placeholder="Select your specialty"
              isActive={false}
              borderColor="#D1D5DB"
              labelStyle={{}}
              onFocus={() => {}}
              onBlur={() => {}}
              searchable={true}
              clearable={true}
              modalType="bottom-sheet"
            />
          </View>

          {/* Country of Practice */}
          <View className="mb-6">
            <UnifiedDropdown
              value={formData.countryOfPractice || ''}
              onValueChange={value => {
                if (typeof value === 'string') {
                  handleInputChange('countryOfPractice', value);
                }
              }}
              options={transformStringArrayOptions(COUNTRIES)}
              label="Country of Practice *"
              placeholder="Select your country"
              isActive={false}
              borderColor="#D1D5DB"
              labelStyle={{}}
              onFocus={() => {}}
              onBlur={() => {}}
              searchable={true}
              clearable={true}
              modalType="bottom-sheet"
            />
          </View>
        </View>

        {/* Optional Fields Section */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Additional Information (Optional)
          </Text>

          {/* Medical School */}
          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="medicalSchool"
              value={formData.medicalSchool || ''}
              label="Medical School"
              placeholder="Enter your medical school"
              onChangeText={text => handleInputChange('medicalSchool', text)}
              isActive={false}
              borderColor="#D1D5DB"
              labelStyle={{}}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </View>

          {/* Years of Experience */}
          <View className="mb-4">
            <UnifiedDropdown
              value={formData.yearsOfExperience || ''}
              onValueChange={value => {
                if (typeof value === 'string') {
                  handleInputChange('yearsOfExperience', value);
                }
              }}
              options={transformStringArrayOptions(EXPERIENCE_OPTIONS)}
              label="Years of Experience"
              placeholder="Select experience level"
              isActive={false}
              borderColor="#D1D5DB"
              labelStyle={{}}
              onFocus={() => {}}
              onBlur={() => {}}
              searchable={true}
              clearable={true}
              modalType="bottom-sheet"
            />
          </View>

          {/* Board Certifications */}
          <View className="mb-4">
            <FormFieldWrapper
              type="text"
              field="boardCertifications"
              value={formData.boardCertifications || ''}
              label="Board Certifications"
              placeholder="List your certifications (separated by commas)"
              onChangeText={text =>
                handleInputChange('boardCertifications', text)
              }
              isActive={false}
              borderColor="#D1D5DB"
              labelStyle={{}}
              onFocus={() => {}}
              onBlur={() => {}}
              multiline={true}
            />
          </View>

          {/* Languages */}
          <View className="mb-6">
            <FormFieldWrapper
              type="text"
              field="languages"
              value={formData.languages || ''}
              label="Languages Spoken"
              placeholder="List languages (separated by commas)"
              onChangeText={text => handleInputChange('languages', text)}
              isActive={false}
              borderColor="#D1D5DB"
              labelStyle={{}}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </View>
        </View>

        {/* Credentials Upload Section */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Upload Credentials (Recommended)
          </Text>

          <TouchableOpacity
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg items-center justify-center mb-4"
            onPress={handleFileUpload}
            activeOpacity={0.7}
          >
            <Text className="text-4xl mb-2">📄</Text>
            <Text className="text-base font-medium text-gray-700">
              {uploadedFile ? uploadedFile.name : 'Upload Medical License'}
            </Text>
            <Text className="text-sm text-gray-500 text-center mt-1">
              PDF or Image • Max 10MB
            </Text>
          </TouchableOpacity>

          {uploadedFile && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-3 flex-row items-center">
              <Text className="text-green-600 text-lg mr-2">✓</Text>
              <View className="flex-1">
                <Text className="text-green-700 font-medium">
                  File uploaded successfully
                </Text>
                <Text className="text-green-600 text-sm">
                  {uploadedFile.name}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Verification Notice */}
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <Text className="text-blue-700 font-medium mb-2">
            📋 Manual Verification Required
          </Text>
          <Text className="text-blue-600 text-sm">
            Your credentials will be reviewed by our team within 24-48 hours.
            You'll receive an email confirmation once your profile is verified
            and all doctor features are unlocked.
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          onPress={handleSubmit}
          title={isLoading ? 'Submitting...' : 'Submit for Review'}
          containerClassName={`w-full h-14 rounded-lg items-center justify-center mb-4 ${
            isFormValid && !isLoading ? 'bg-[#F05C0C]' : 'bg-gray-300'
          }`}
          textClassName={`font-semibold text-base ${
            isFormValid && !isLoading ? 'text-white' : 'text-gray-500'
          }`}
          disabled={!isFormValid || isLoading}
        />

        {/* Skip Option */}
        <TouchableOpacity
          onPress={() => onSubmit({} as DoctorProfileData)} // Skip with empty data
          className="w-full h-12 items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-gray-600 text-base">
            Skip for now (complete later in settings)
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default DoctorProfileSetupForm;
