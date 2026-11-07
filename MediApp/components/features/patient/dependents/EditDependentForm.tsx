import {
  Button,
  CustomModal,
  StandardBottomButton,
} from '@/components/shared/ui';
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import {
  commonValidationRules,
  useAnimatedFormField,
  useDeleteDependentMutation,
  useFormValidation,
  useModal,
  useUpdateDependentMutation,
} from '@/hooks';
import type { UpdateDependentRequest } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RELATIONSHIP_OPTIONS, GENDER_OPTIONS } from '@/constants/Patient';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

// Form field keys
// Matches AddDependentForm keys for consistency
type DependentFormFieldKey =
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'gender'
  | 'relationship'
  | 'waNumber';

interface DependentData {
  id: number;
  first_name: string;
  last_name: string;
  dob: string;
  gender?: string;
  relationship: string;
  wa_number?: string;
}

interface EditDependentFormProps {
  dependent: DependentData;
  onSuccess?: (_updatedDependent: any) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

const EditDependentForm: React.FC<EditDependentFormProps> = ({
  dependent,
  onSuccess,
  onCancel,
  onDelete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    optional: false,
  });

  // Use custom hooks
  const { modalProps, showModal } = useModal();
  const updateDependentMutation = useUpdateDependentMutation();
  const deleteDependentMutation = useDeleteDependentMutation();

  // Custom validation rules for dependent form
  const dependentValidationRules = {
    firstName: (value: string, _formData?: any) => {
      if (!value.trim()) return 'First name is required';
      if (value.length < 2) return 'First name must be at least 2 characters';
      return null;
    },
    lastName: (value: string, _formData?: any) => {
      if (!value.trim()) return 'Last name is required';
      if (value.length < 2) return 'Last name must be at least 2 characters';
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
      return null;
    },
    gender: () => null, // Optional
    waNumber: commonValidationRules.optionalPhone,
  };

  // Initialize form validation with existing dependent data
  const { formData, errors, handleInputChange, setErrors, setFormData } =
    useFormValidation<DependentFormFieldKey>(
      {
        firstName: dependent.first_name,
        lastName: dependent.last_name,
        dob: dependent.dob,
        gender: dependent.gender || '',
        relationship: dependent.relationship,
        waNumber: dependent.wa_number || '',
      },
      dependentValidationRules
    );

  // Define form fields
  const formFields: DependentFormFieldKey[] = [
    'firstName',
    'lastName',
    'dob',
    'gender',
    'relationship',
    'waNumber',
  ];

  // Setup animated form field hook
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  // Update form data when dependent prop changes
  useEffect(() => {
    setFormData({
      firstName: dependent.first_name,
      lastName: dependent.last_name,
      dob: dependent.dob,
      gender: dependent.gender || '',
      relationship: dependent.relationship,
      waNumber: dependent.wa_number || '',
    });
  }, [dependent, setFormData]);

  // Function to check if data has changed
  const checkHasChanges = (
    currentData: Record<DependentFormFieldKey, string>
  ) => {
    return (
      currentData.firstName !== dependent.first_name ||
      currentData.lastName !== dependent.last_name ||
      currentData.dob !== dependent.dob ||
      (currentData.gender || '') !== (dependent.gender || '') ||
      currentData.relationship !== dependent.relationship ||
      (currentData.waNumber || '') !== (dependent.wa_number || '')
    );
  };

  const [isFormValid, setIsFormValid] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check form validity in real-time
  useEffect(() => {
    const checkValidity = () => {
      // Required fields
      const requiredFields = ['firstName', 'lastName', 'dob', 'relationship'];

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
      if (formData.waNumber) {
        if (dependentValidationRules.waNumber(formData.waNumber)) return false;
      }

      return true;
    };

    setIsFormValid(checkValidity());
    setHasChanges(checkHasChanges(formData));
  }, [formData, dependentValidationRules, dependent]);

  const handleSubmit = async () => {
    // Validate all required fields
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Required fields for validation
    const requiredFields = ['firstName', 'lastName', 'dob', 'relationship'];

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
      // Prepare updated dependent data matching our API structure
      const updatedData: UpdateDependentRequest = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        relationship: formData.relationship,
        dob: formData.dob,
        gender: formData.gender || undefined,
        emergency_contact: [],
        wa_number: formData.waNumber || undefined,
        metadata: {},
      };

      // Call the dependent update API using React Query mutation
      await updateDependentMutation.mutateAsync({
        patientId: dependent.id,
        data: updatedData,
      });

      // Show success message
      showModal(
        'success',
        'Dependent Updated',
        `${formData.firstName} ${formData.lastName}'s information has been successfully updated.`,
        undefined,
        () => {
          if (onSuccess) {
            onSuccess({ ...dependent, ...updatedData });
          }
        },
        'Continue'
      );
    } catch (error: any) {
      showModal(
        'error',
        'Failed to Update Dependent',
        error.message ||
          'An error occurred while updating the dependent. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

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
                className="flex-row items-center justify-between p-5"
                activeOpacity={1}
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

              {expandedSections.basic && (
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
                        errors.firstName
                          ? '#EF4444'
                          : getBorderColor('firstName')
                      }
                      labelStyle={getLabelStyle('firstName')}
                      onFocus={() => handleFocus('firstName')}
                      onBlur={() => handleBlur('firstName')}
                      onChangeText={text =>
                        handleInputChange('firstName', text)
                      }
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
                      borderColor={
                        errors.dob ? '#EF4444' : getBorderColor('dob')
                      }
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
                      label="Gender (Optional)"
                      options={GENDER_OPTIONS}
                      isActive={selectedInput === 'gender'}
                      borderColor={getBorderColor('gender')}
                      labelStyle={getLabelStyle('gender')}
                      onFocus={() => handleFocus('gender')}
                      onBlur={() => handleBlur('gender')}
                      onValueChange={value =>
                        handleInputChange('gender', value)
                      }
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
                      onValueChange={value =>
                        handleInputChange('relationship', value)
                      }
                      errorMessage={errors.relationship}
                      backgroundColor="white"
                    />
                  </View>

                  {/* Animated Update Button inside the card */}
                  {isFormValid && hasChanges && (
                    <Animated.View
                      className="mt-2"
                      entering={FadeInUp.duration(300)}
                      exiting={FadeOutDown.duration(200)}
                    >
                      <StandardBottomButton
                        onPress={handleSubmit}
                        label={isLoading ? 'Updating...' : 'Update Dependent'}
                        isLoading={isLoading}
                        isDisabled={isLoading || isDeleting}
                      />
                    </Animated.View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default EditDependentForm;
