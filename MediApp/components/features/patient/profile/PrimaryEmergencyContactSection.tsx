import React, { useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { FormFieldWrapper, SingleDropdown } from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { RELATIONSHIP_TYPES } from '@/constants';
import { emergencyContactValidationRules, formatPhoneNumber } from '@/utils';
import type { EmergencyContactData } from '@/stores/patientStore';
import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';

const EMERGENCY_CONTACT_RELATIONSHIP_TYPES = RELATIONSHIP_TYPES.filter(
  type => type.key !== 'main'
);

interface PrimaryEmergencyContactSectionProps {
  emergencyContactData: EmergencyContactData;
  onUpdateEmergencyContactData: (_data: Partial<EmergencyContactData>) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export const PrimaryEmergencyContactSection: React.FC<
  PrimaryEmergencyContactSectionProps
> = ({
  emergencyContactData: _emergencyContactData,
  onUpdateEmergencyContactData: _onUpdateEmergencyContactData,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving,
}) => {
  const { watch } = useFormContext();
  const formValues = watch();
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const formFields = [
    'primaryName',
    'primaryPhone',
    'primaryEmail',
    'primaryRelationship',
  ];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  const getFormattedPhoneDisplay = () => {
    if (!formValues?.primaryPhone) return 'Not provided';
    const country =
      countryCodes.find(c => c.code === formValues.primaryCountryCode) ||
      countryCodes[0];
    return `${country.dial_code} ${formValues.primaryPhone}`;
  };

  return (
    <View className="mb-6">
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between p-6 pb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="account-circle"
                size={22}
                color="white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Primary Contact
              </Text>
              <Text className="text-sm text-gray-600">
                Main person to contact in emergencies
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
            <View className="mb-4">
              <Controller
                name="primaryName"
                rules={emergencyContactValidationRules.primaryName}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field="primaryName"
                    value={value}
                    label="Full Name"
                    placeholder="Jane Smith"
                    isActive={selectedInput === 'primaryName'}
                    borderColor={
                      error ? '#EF4444' : getBorderColor('primaryName')
                    }
                    labelStyle={getLabelStyle('primaryName')}
                    onFocus={() => handleFocus('primaryName')}
                    onBlur={() => {
                      handleBlur('primaryName');
                      onBlur();
                    }}
                    onChangeText={onChange}
                    errorMessage={error?.message}
                  />
                )}
              />
            </View>

            {/* Country selector */}
            <Controller
              name="primaryCountryCode"
              render={({
                field: {
                  value: countryCodeValue,
                  onChange: onCountryCodeChange,
                },
              }) => {
                const selectedCountry =
                  countryCodes.find(c => c.code === countryCodeValue) ||
                  countryCodes[0];

                const handleCountrySelect = (
                  country: (typeof countryCodes)[0]
                ) => {
                  onCountryCodeChange(country.code);
                  setShowCountryPicker(false);
                };

                return (
                  <>
                    <TouchableOpacity
                      className="w-full h-14 px-4 border-2 border-gray-200 rounded-lg flex-row items-center justify-between mb-4"
                      onPress={() => setShowCountryPicker(!showCountryPicker)}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-2">
                          {selectedCountry.flag}
                        </Text>
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
                              <Text className="text-xl mr-3">
                                {country.flag}
                              </Text>
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
                  </>
                );
              }}
            />

            {/* Phone number input */}
            <View className="mb-4">
              <Controller
                name="primaryCountryCode"
                render={({ field: { value: countryCodeValue } }) => {
                  const selectedCountry =
                    countryCodes.find(c => c.code === countryCodeValue) ||
                    countryCodes[0];

                  return (
                    <Controller
                      name="primaryPhone"
                      rules={{
                        required: 'Primary contact phone number is required',
                        validate: (value: string) => {
                          if (!value || value.trim().length === 0) {
                            return 'Phone number is required';
                          }
                          const cleaned = value.replace(/\D/g, '');
                          const mask = selectedCountry.mask;
                          const requiredDigits = mask
                            ? (mask.match(/#/g) || []).length
                            : 10;

                          if (cleaned.length < requiredDigits) {
                            return `Phone number must be ${requiredDigits} digits for ${selectedCountry.name}`;
                          }
                          return true;
                        },
                      }}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => {
                        const handlePhoneChange = (text: string) => {
                          const formatted = formatPhoneNumber(
                            text,
                            selectedCountry.code
                          );
                          onChange(formatted);
                        };

                        return (
                          <FormFieldWrapper
                            type="text"
                            field="primaryPhone"
                            value={value}
                            label="Phone Number"
                            placeholder={
                              selectedCountry.mask
                                ? selectedCountry.mask.replace(/#/g, '0')
                                : 'Enter phone number'
                            }
                            onChangeText={handlePhoneChange}
                            keyboardType="phone-pad"
                            errorMessage={error?.message}
                            isActive={selectedInput === 'primaryPhone'}
                            borderColor={
                              error ? '#EF4444' : getBorderColor('primaryPhone')
                            }
                            labelStyle={getLabelStyle('primaryPhone')}
                            onFocus={() => handleFocus('primaryPhone')}
                            onBlur={() => {
                              handleBlur('primaryPhone');
                              onBlur();
                            }}
                          />
                        );
                      }}
                    />
                  );
                }}
              />
            </View>

            <View className="mb-4">
              <Controller
                name="primaryEmail"
                rules={emergencyContactValidationRules.primaryEmail}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field="primaryEmail"
                    value={value}
                    label="Email Address (Optional)"
                    placeholder="jane.smith@example.com"
                    isActive={selectedInput === 'primaryEmail'}
                    borderColor={
                      error ? '#EF4444' : getBorderColor('primaryEmail')
                    }
                    labelStyle={getLabelStyle('primaryEmail')}
                    onFocus={() => handleFocus('primaryEmail')}
                    onBlur={() => {
                      handleBlur('primaryEmail');
                      onBlur();
                    }}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    errorMessage={error?.message}
                  />
                )}
              />
            </View>

            <View className="mb-6">
              <Controller
                name="primaryRelationship"
                rules={emergencyContactValidationRules.primaryRelationship}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <View>
                    <SingleDropdown
                      field="primaryRelationship"
                      value={value}
                      options={EMERGENCY_CONTACT_RELATIONSHIP_TYPES}
                      onValueChange={onChange}
                      label="Relationship"
                      placeholder="Select relationship"
                      isActive={selectedInput === 'primaryRelationship'}
                      borderColor={
                        error
                          ? '#EF4444'
                          : getBorderColor('primaryRelationship')
                      }
                      labelStyle={getLabelStyle('primaryRelationship')}
                      onFocus={() => handleFocus('primaryRelationship')}
                      onBlur={() => {
                        handleBlur('primaryRelationship');
                        onBlur();
                      }}
                      backgroundColor="white"
                    />
                    {error && (
                      <Text className="text-red-500 text-sm mt-1 ml-3">
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
                  {isSaving ? 'Saving...' : 'Save Primary Contact'}
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
            <View>
              <View>
                <Text className="text-sm text-gray-500 mb-1">Full Name</Text>
                <Text className="text-base text-gray-900">
                  {formValues?.primaryName || 'Not provided'}
                </Text>
              </View>

              <View className="mt-4">
                <Text className="text-sm text-gray-500 mb-1">Phone Number</Text>
                <Text className="text-base text-gray-900">
                  {getFormattedPhoneDisplay()}
                </Text>
              </View>

              <View className="mt-4">
                <Text className="text-sm text-gray-500 mb-1">
                  Email Address
                </Text>
                <Text className="text-base text-gray-900">
                  {formValues?.primaryEmail || 'Not provided'}
                </Text>
              </View>

              <View className="mt-4">
                <Text className="text-sm text-gray-500 mb-1">Relationship</Text>
                <Text className="text-base text-gray-900">
                  {RELATIONSHIP_TYPES.find(
                    type => type.key === formValues?.primaryRelationship
                  )?.value ||
                    formValues?.primaryRelationship ||
                    'Not provided'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};
