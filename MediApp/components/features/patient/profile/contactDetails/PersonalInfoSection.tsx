import React, { useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { FormFieldWrapper, Card, Button } from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { GENDER_OPTIONS } from '@/constants';
import { UnifiedDropdown } from '@/components/shared/ui/Form/UnifiedDropdown';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

interface PersonalInfoSectionProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  fieldNames: Record<string, string>;
  validationRules: Record<string, any>;
  readOnly?: boolean;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  isEditing,
  onToggleEdit,
  onSave,
  isSaving,
  fieldNames,
  validationRules,
  readOnly,
}) => {
  const {
    control,
    watch,
    formState: { dirtyFields, errors },
  } = useFormContext();
  const formFields = useMemo(() => Object.values(fieldNames), [fieldNames]);

  // Calculate if any field in this section has changes
  const hasChanges = useMemo(() => {
    return Object.values(fieldNames).some(fieldName => dirtyFields[fieldName]);
  }, [dirtyFields, fieldNames]);

  // Calculate if any field in this section has errors
  const hasErrors = useMemo(() => {
    return Object.values(fieldNames).some(fieldName => errors[fieldName]);
  }, [errors, fieldNames]);

  const shouldShowSave = (hasChanges && !hasErrors) || isSaving;
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  const formValues = watch();

  return (
    <View className="mb-6">
      <View className="p-0 border-b border-gray-200">
        <View className="flex-row items-center justify-between p-6 pb-4">
          <View className="flex-row items-center flex-1">
            <MaterialCommunityIcons
              name="account"
              size={28}
              color="#F05C0C"
              style={{ marginRight: 12 }}
            />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Personal Information
              </Text>
              <Text className="text-sm text-gray-600">
                Basic details and identification
              </Text>
            </View>
          </View>

          {/* Edit Button */}
          {!readOnly && (
            <TouchableOpacity
              onPress={onToggleEdit}
              className="ml-3 p-2 rounded-full bg-gray-100"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isEditing ? 'close' : 'pencil'}
                size={18}
                color="#6B7280"
              />
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          // Edit Mode
          <View className="px-6 pb-6">
            <View className="flex-row mb-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={fieldNames.firstName}
                  rules={validationRules.firstName}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={fieldNames.firstName as any}
                      value={value}
                      label="First Name"
                      placeholder="John"
                      isActive={selectedInput === fieldNames.firstName}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(fieldNames.firstName)
                      }
                      labelStyle={getLabelStyle(fieldNames.firstName)}
                      onFocus={() => handleFocus(fieldNames.firstName)}
                      onBlur={() => {
                        handleBlur(fieldNames.firstName);
                        onBlur();
                      }}
                      onChangeText={onChange}
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={fieldNames.lastName}
                  rules={validationRules.lastName}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={fieldNames.lastName as any}
                      value={value}
                      label="Last Name"
                      placeholder="Smith"
                      isActive={selectedInput === fieldNames.lastName}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(fieldNames.lastName)
                      }
                      labelStyle={getLabelStyle(fieldNames.lastName)}
                      onFocus={() => handleFocus(fieldNames.lastName)}
                      onBlur={() => {
                        handleBlur(fieldNames.lastName);
                        onBlur();
                      }}
                      onChangeText={onChange}
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>
            </View>

            <View className="mb-4">
              <Controller
                control={control}
                name={fieldNames.dateOfBirth}
                rules={validationRules.dateOfBirth}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="date"
                    field={fieldNames.dateOfBirth as any}
                    value={value}
                    label="Date of Birth"
                    isActive={selectedInput === fieldNames.dateOfBirth}
                    borderColor={
                      error ? '#EF4444' : getBorderColor(fieldNames.dateOfBirth)
                    }
                    labelStyle={getLabelStyle(fieldNames.dateOfBirth)}
                    onFocus={() => handleFocus(fieldNames.dateOfBirth)}
                    onBlur={() => {
                      handleBlur(fieldNames.dateOfBirth);
                      onBlur();
                    }}
                    onChange={onChange}
                    dateFormat="full"
                    errorMessage={error?.message}
                  />
                )}
              />
            </View>

            <View className="mb-4">
              <Controller
                control={control}
                name={fieldNames.gender}
                rules={validationRules.gender}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <View>
                    <UnifiedDropdown
                      label="Gender"
                      placeholder="Select gender"
                      value={value}
                      options={GENDER_OPTIONS}
                      onValueChange={val => onChange(val)}
                      onFocus={() => handleFocus(fieldNames.gender)}
                      onBlur={() => {
                        handleBlur(fieldNames.gender);
                        onBlur();
                      }}
                      error={error?.message}
                      backgroundColor="white"
                    />
                  </View>
                )}
              />
            </View>

            {/* Save Button */}
            {shouldShowSave && (
              <Animated.View
                entering={FadeInUp.duration(300)}
                exiting={FadeOutDown.duration(200)}
              >
                <Button
                  onPress={onSave}
                  title={isSaving ? 'Saving...' : 'Save Changes'}
                  disabled={isSaving}
                  containerClassName={`w-full bg-[#F05C0C] rounded-lg py-3 items-center justify-center ${isSaving ? 'opacity-50' : ''
                    }`}
                  textClassName="text-white font-semibold text-base"
                >
                  {isSaving && (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                      className="ml-2"
                    />
                  )}
                </Button>
              </Animated.View>
            )}
          </View>
        ) : (
          // Display Mode
          <View className="px-6 pb-6">
            <View className="flex-row" style={{ gap: 16 }}>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">First Name</Text>
                <Text className="text-base text-gray-900">
                  {formValues?.[fieldNames.firstName] || 'Not provided'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Last Name</Text>
                <Text className="text-base text-gray-900">
                  {formValues?.[fieldNames.lastName] || 'Not provided'}
                </Text>
              </View>
            </View>

            <View className="flex-row mt-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">
                  Date of Birth
                </Text>
                <Text className="text-base text-gray-900">
                  {formValues?.[fieldNames.dateOfBirth] || 'Not provided'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Gender</Text>
                <Text className="text-base text-gray-900 capitalize">
                  {formValues?.[fieldNames.gender] || 'Not provided'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};
