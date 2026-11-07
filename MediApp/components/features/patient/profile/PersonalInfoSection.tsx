import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { FormFieldWrapper } from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import {
  genderOptions,
  getGenderLabel,
  formatDateDisplay,
  validationRules,
  ContactFormData,
} from '@/utils';
import type { ContactData } from '@/stores/patientStore';

interface PersonalInfoSectionProps {
  contactData: ContactData;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  contactData,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving,
}) => {
  const { control } = useFormContext<ContactFormData>();
  const formFields = ['firstName', 'lastName', 'dateOfBirth', 'gender'];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  return (
    <View className="mb-6">
      <View className="bg-white rounded-xl shadow-sm border border-gray-100">
        <View className="flex-row items-center justify-between p-6 pb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons name="account" size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Name & Identity
              </Text>
              <Text className="text-sm text-gray-600">
                Your personal identification details
              </Text>
            </View>
          </View>

          {/* Edit Button */}
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
        </View>

        {isEditing ? (
          // Edit Mode
          <View className="px-6 pb-6">
            <View className="flex-row mb-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="firstName"
                  rules={validationRules.firstName}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field="firstName"
                      value={value}
                      label="First Name"
                      placeholder="John"
                      isActive={selectedInput === 'firstName'}
                      borderColor={
                        error ? '#EF4444' : getBorderColor('firstName')
                      }
                      labelStyle={getLabelStyle('firstName')}
                      onFocus={() => handleFocus('firstName')}
                      onBlur={() => {
                        handleBlur('firstName');
                        onBlur();
                      }}
                      onChangeText={text => {
                        onChange(text);
                      }}
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="lastName"
                  rules={validationRules.lastName}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field="lastName"
                      value={value}
                      label="Last Name"
                      placeholder="Smith"
                      isActive={selectedInput === 'lastName'}
                      borderColor={
                        error ? '#EF4444' : getBorderColor('lastName')
                      }
                      labelStyle={getLabelStyle('lastName')}
                      onFocus={() => handleFocus('lastName')}
                      onBlur={() => {
                        handleBlur('lastName');
                        onBlur();
                      }}
                      onChangeText={text => {
                        onChange(text);
                      }}
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>
            </View>

            <View className="mb-4">
              <Controller
                control={control}
                name="dateOfBirth"
                rules={validationRules.dateOfBirth}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="date"
                    field="dateOfBirth"
                    value={value}
                    label="Date of Birth"
                    isActive={selectedInput === 'dateOfBirth'}
                    borderColor={
                      error ? '#EF4444' : getBorderColor('dateOfBirth')
                    }
                    labelStyle={getLabelStyle('dateOfBirth')}
                    onFocus={() => handleFocus('dateOfBirth')}
                    onBlur={() => {
                      handleBlur('dateOfBirth');
                      onBlur();
                    }}
                    onChange={dateString => {
                      onChange(dateString);
                    }}
                    dateFormat="full"
                    errorMessage={error?.message}
                  />
                )}
              />
            </View>

            <View className="mb-4">
              <Controller
                control={control}
                name="gender"
                rules={validationRules.gender}
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </Text>
                    <View className="flex-row flex-wrap">
                      {genderOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            onChange(option.value);
                          }}
                          className={`px-3 py-1 mr-2 mb-2 rounded-full ${
                            value === option.value
                              ? 'bg-[#F05C0C]'
                              : 'bg-gray-200'
                          }`}
                        >
                          <Text
                            className={
                              value === option.value
                                ? 'text-white'
                                : 'text-gray-700'
                            }
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {error && (
                      <Text className="text-red-500 text-sm mt-1">
                        {error.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              className={`w-full bg-[#F05C0C] rounded-lg py-3 items-center justify-center ${
                isSaving ? 'opacity-50' : ''
              }`}
              onPress={onSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center">
                <Text className="text-white font-semibold text-base">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
                {isSaving && (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    className="ml-2"
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          // Display Mode
          <View className="px-6 pb-6">
            <View className="space-y-4">
              <View className="flex-row" style={{ gap: 16 }}>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">First Name</Text>
                  <Text className="text-base text-gray-900">
                    {String(contactData.firstName || 'Not provided')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Last Name</Text>
                  <Text className="text-base text-gray-900">
                    {String(contactData.lastName || 'Not provided')}
                  </Text>
                </View>
              </View>
              <View className="flex-row" style={{ gap: 16 }}>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">
                    Date of Birth
                  </Text>
                  <Text className="text-base text-gray-900">
                    {formatDateDisplay(contactData.dateOfBirth)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Gender</Text>
                  <Text className="text-base text-gray-900">
                    {contactData.gender
                      ? getGenderLabel(contactData.gender)
                      : 'Not provided'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};
