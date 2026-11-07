import {
  CustomModal,
  StandardBottomButton,
  UnifiedDropdown,
} from '@/components/shared/ui';
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import {
  commonValidationRules,
  useAnimatedFormField,
  useCreateDependentMutation,
  useFormValidation,
  useModal,
} from '@/hooks';
import type { CreateDependentRequest } from '@/types';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo, useEffect } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { RELATIONSHIP_OPTIONS, GENDER_OPTIONS } from '@/constants/Patient';
import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';
import {
  formatPhoneNumber as formatPhone,
  getCountryFromLocation,
  logger,
} from '@/utils';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

// Form field keys
type DependentFormFieldKey =
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'gender'
  | 'relationship'
  | 'emergencyName'
  | 'emergencyPhone'
  | 'emergencyRelationship'
  | 'emergencyEmail'
  | 'emergencyCountryCode'
  | 'waNumber'
  | 'waCountryCode'
  | 'countryId';

interface AddDependentFormProps {
  onSuccess?: (_dependent: any) => void;
  onCancel?: () => void;
}

const AddDependentForm: React.FC<AddDependentFormProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    emergency: false,
    optional: false,
  });
  const [isCountryDetected, setIsCountryDetected] = useState(false);
  const [detectedCountryCode, setDetectedCountryCode] = useState<string>('TN');

  // Use custom hooks
  const { modalProps, showModal } = useModal();
  const createDependentMutation = useCreateDependentMutation();

  // Detect user's country on mount
  useEffect(() => {
    const detectCountry = async () => {
      if (!isCountryDetected) {
        try {
          const countryCode = await getCountryFromLocation();
          setDetectedCountryCode(countryCode);
          setIsCountryDetected(true);
          logger.info('Country detected', {
            component: 'AddDependentForm',
            detectedCountryCode: countryCode,
          });
        } catch (error) {
          logger.warn('Failed to detect country, using default', {
            component: 'AddDependentForm',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          setDetectedCountryCode('TN'); // Default fallback
          setIsCountryDetected(true);
        }
      }
    };

    detectCountry();
  }, [isCountryDetected]);

  const countryOptions = useMemo(
    () =>
      countryCodes.map(country => ({
        key: country.code,
        value: country.code,
        label: country.name,
        icon: country.flag,
        description: country.dial_code,
        metadata: country,
      })),
    []
  );

  // Custom validation rules for dependent form
  const dependentValidationRules = {
    firstName: (value: string, _formData?: any) => {
      if (!value.trim()) return 'First name is required';
      if (value.length < 2) return 'First name must be at least 2 characters';
      if (value.length > 255)
        return 'First name must not exceed 255 characters';
      return null;
    },
    lastName: (value: string, _formData?: any) => {
      if (!value.trim()) return 'Last name is required';
      if (value.length < 2) return 'Last name must be at least 2 characters';
      if (value.length > 255) return 'Last name must not exceed 255 characters';
      return null;
    },
    dob: (value: string, _formData?: any) => {
      if (!value) return 'Date of birth is required';
      const date = new Date(value);
      const today = new Date();
      if (date > today) return 'Date of birth cannot be in the future';
      const age = today.getFullYear() - date.getFullYear();
      if (age > 120) return 'Age cannot be more than 120 years';
      return null;
    },
    relationship: (value: string, _formData?: any) => {
      if (!value) return 'Relationship is required';
      if (value === 'main') return 'Dependents cannot have "main" relationship';
      return null;
    },
    emergencyName: (value: string) => {
      // Emergency contact is optional
      if (!value.trim()) return null;
      return null;
    },
    emergencyPhone: (value: string) => {
      // Emergency contact is optional, but if provided should be valid
      if (!value.trim()) return null;
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
      if (cleaned.length > 20) return 'Phone number must not exceed 20 digits';
      return null;
    },
    emergencyRelationship: () => null, // Optional
    emergencyEmail: commonValidationRules.optionalEmail,
    emergencyCountryCode: () => null, // Optional
    gender: (value: string, _formData?: any) => {
      if (!value) return 'Gender is required';
      if (value && value.length > 10)
        return 'Gender must not exceed 10 characters';
      return null;
    },
    waNumber: (value: string) => {
      if (!value.trim()) return null;
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 10)
        return 'WhatsApp number must be at least 10 digits';
      if (cleaned.length > 20)
        return 'WhatsApp number must not exceed 20 digits';
      return null;
    },
    waCountryCode: () => null, // Optional
    countryId: () => null, // Optional
  };

  // Initialize form validation
  const { formData, errors, handleInputChange, setErrors } =
    useFormValidation<DependentFormFieldKey>(
      {
        firstName: '',
        lastName: '',
        dob: '',
        gender: '',
        relationship: '',
        emergencyName: '',
        emergencyPhone: '',
        emergencyRelationship: '',
        emergencyEmail: '',
        emergencyCountryCode: detectedCountryCode,
        waNumber: '',
        waCountryCode: detectedCountryCode,
        countryId: '',
      },
      dependentValidationRules
    );

  // Update country codes when detection completes
  useEffect(() => {
    if (isCountryDetected) {
      handleInputChange('emergencyCountryCode', detectedCountryCode);
      handleInputChange('waCountryCode', detectedCountryCode);
    }
  }, [isCountryDetected, detectedCountryCode, handleInputChange]);

  // Define form fields
  const formFields: DependentFormFieldKey[] = [
    'firstName',
    'lastName',
    'dob',
    'gender',
    'relationship',
    'emergencyName',
    'emergencyPhone',
    'emergencyRelationship',
    'emergencyEmail',
    'emergencyCountryCode',
    'waNumber',
    'waCountryCode',
    'countryId',
  ];

  // Setup animated form field hook
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  const handleSubmit = async () => {
    // Validate all required fields
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Required fields for validation
    const requiredFields = [
      'firstName',
      'lastName',
      'dob',
      'relationship',
      'gender',
    ];

    requiredFields.forEach(field => {
      const error = dependentValidationRules[
        field as keyof typeof dependentValidationRules
      ](formData[field as DependentFormFieldKey], formData);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    // Validate optional fields if they have values
    if (formData.emergencyEmail) {
      const emailError = dependentValidationRules.emergencyEmail(
        formData.emergencyEmail
      );
      if (emailError) {
        newErrors.emergencyEmail = emailError;
        isValid = false;
      }
    }

    if (formData.emergencyPhone) {
      const phoneError = dependentValidationRules.emergencyPhone(
        formData.emergencyPhone
      );
      if (phoneError) {
        newErrors.emergencyPhone = phoneError;
        isValid = false;
      }
    }

    if (formData.waNumber) {
      const phoneError = dependentValidationRules.waNumber(formData.waNumber);
      if (phoneError) {
        newErrors.waNumber = phoneError;
        isValid = false;
      }
    }

    setErrors(newErrors);
    if (!isValid) return;

    setIsLoading(true);
    try {
      const emergencyContacts = [];
      if (formData.emergencyName || formData.emergencyPhone) {
        emergencyContacts.push({
          name: formData.emergencyName || 'Not provided',
          phone: formData.emergencyPhone || 'Not provided',
          relationship: formData.emergencyRelationship || 'other',
          email: formData.emergencyEmail || undefined,
          is_primary: true,
        });
      }

      // Prepare dependent data matching our API structure
      const dependentData: CreateDependentRequest = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        relationship: formData.relationship,
        dob: formData.dob,
        gender: formData.gender || undefined,
        emergency_contact:
          emergencyContacts.length > 0 ? emergencyContacts : undefined,
        wa_number: formData.waNumber || undefined,
        metadata: {},
      };

      if (formData.countryId) {
        (dependentData as any).country_id = parseInt(formData.countryId);
      }

      // Call the dependent creation API using React Query mutation
      const newDependent =
        await createDependentMutation.mutateAsync(dependentData);

      // Show success message
      showModal(
        'success',
        'Dependent Added',
        `${formData.firstName} ${formData.lastName} has been successfully added as a dependent.`,
        undefined,
        () => {
          if (onSuccess) {
            onSuccess(newDependent);
          }
        },
        'Continue'
      );
    } catch {
      Alert.alert('Error', 'Failed to add dependent. Please try again.', [
        { text: 'OK', style: 'default' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const [isFormValid, setIsFormValid] = useState(false);

  // Check form validity in real-time
  useEffect(() => {
    const checkValidity = () => {
      // Required fields
      const requiredFields = [
        'firstName',
        'lastName',
        'dob',
        'relationship',
        'gender',
      ];

      // Check if all required fields are filled and valid
      for (const field of requiredFields) {
        const value = formData[field as DependentFormFieldKey];
        if (!value) return false;

        const error = dependentValidationRules[
          field as keyof typeof dependentValidationRules
        ](value, formData);

        if (error) return false;
      }

      // Check optional fields if they have values
      if (formData.emergencyEmail) {
        if (dependentValidationRules.emergencyEmail(formData.emergencyEmail))
          return false;
      }

      if (formData.emergencyPhone) {
        if (dependentValidationRules.emergencyPhone(formData.emergencyPhone))
          return false;
      }

      if (formData.waNumber) {
        if (dependentValidationRules.waNumber(formData.waNumber)) return false;
      }

      return true;
    };

    setIsFormValid(checkValidity());
  }, [formData, dependentValidationRules]);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-md mx-auto py-6">
          {/* Custom Modal */}
          <CustomModal {...modalProps} />

          {/* Basic Information Section */}
          <View className="mb-4">
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <TouchableOpacity
                activeOpacity={1}
                className="flex-row items-center justify-between p-5"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="account"
                      size={22}
                      color="white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">
                      Basic Information
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View className="px-5 pb-5">
                {/* First Name */}
                <View className="mb-4">
                  <FormFieldWrapper
                    type="text"
                    field="firstName"
                    value={formData.firstName}
                    label="First Name"
                    isActive={selectedInput === 'firstName'}
                    borderColor={
                      errors.firstName ? '#EF4444' : getBorderColor('firstName')
                    }
                    labelStyle={getLabelStyle('firstName')}
                    onFocus={() => handleFocus('firstName')}
                    onBlur={() => handleBlur('firstName')}
                    onChangeText={text => handleInputChange('firstName', text)}
                    errorMessage={errors.firstName}
                  />
                </View>

                {/* Last Name */}
                <View className="mb-4">
                  <FormFieldWrapper
                    type="text"
                    field="lastName"
                    value={formData.lastName}
                    label="Last Name"
                    isActive={selectedInput === 'lastName'}
                    borderColor={
                      errors.lastName ? '#EF4444' : getBorderColor('lastName')
                    }
                    labelStyle={getLabelStyle('lastName')}
                    onFocus={() => handleFocus('lastName')}
                    onBlur={() => handleBlur('lastName')}
                    onChangeText={text => handleInputChange('lastName', text)}
                    errorMessage={errors.lastName}
                  />
                </View>

                {/* Date of Birth */}
                <View className="mb-4">
                  <FormFieldWrapper
                    type="date"
                    field="dob"
                    value={formData.dob}
                    label="Date of Birth"
                    isActive={selectedInput === 'dob'}
                    borderColor={errors.dob ? '#EF4444' : getBorderColor('dob')}
                    labelStyle={getLabelStyle('dob')}
                    onFocus={() => handleFocus('dob')}
                    onBlur={() => handleBlur('dob')}
                    onChange={date => handleInputChange('dob', date)}
                    errorMessage={errors.dob}
                  />
                </View>

                {/* Gender */}
                <View className="mb-4">
                  <FormFieldWrapper
                    type="singleDropdown"
                    field="gender"
                    value={formData.gender}
                    label="Gender"
                    options={GENDER_OPTIONS}
                    isActive={selectedInput === 'gender'}
                    borderColor={getBorderColor('gender')}
                    labelStyle={getLabelStyle('gender')}
                    onFocus={() => handleFocus('gender')}
                    onBlur={() => handleBlur('gender')}
                    onValueChange={value => {
                      const selectedOption = GENDER_OPTIONS.find(
                        option => option.key === value || option.value === value
                      );
                      handleInputChange(
                        'gender',
                        selectedOption ? selectedOption.key : value
                      );
                    }}
                    backgroundColor="white"
                  />
                </View>

                {/* Relationship */}
                <View className="mb-4">
                  <FormFieldWrapper
                    type="singleDropdown"
                    field="relationship"
                    value={formData.relationship}
                    label="Relationship"
                    options={RELATIONSHIP_OPTIONS}
                    isActive={selectedInput === 'relationship'}
                    borderColor={
                      errors.relationship
                        ? '#EF4444'
                        : getBorderColor('relationship')
                    }
                    labelStyle={getLabelStyle('relationship')}
                    onFocus={() => handleFocus('relationship')}
                    onBlur={() => handleBlur('relationship')}
                    onValueChange={value => {
                      const selectedOption = RELATIONSHIP_OPTIONS.find(
                        option => option.key === value || option.value === value
                      );
                      handleInputChange(
                        'relationship',
                        selectedOption ? selectedOption.key : value
                      );
                    }}
                    errorMessage={errors.relationship}
                    backgroundColor="white"
                  />
                </View>

                {/* Animated Add Button inside the card */}
                {isFormValid && (
                  <Animated.View
                    className="mt-2"
                    entering={FadeInUp.duration(300)}
                    exiting={FadeOutDown.duration(200)}
                  >
                    <StandardBottomButton
                      onPress={handleSubmit}
                      label={isLoading ? 'Adding...' : 'Add Dependent'}
                      isLoading={isLoading}
                      isDisabled={isLoading}
                    />
                  </Animated.View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AddDependentForm;
