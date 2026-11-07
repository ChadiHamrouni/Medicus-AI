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
import { emergencyContactValidationRules, formatPhoneNumber } from '@/utils';
import { RELATIONSHIP_TYPES } from '@/constants';
import type { EmergencyContactData } from '@/stores/patientStore';
import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';

const EMERGENCY_CONTACT_RELATIONSHIP_TYPES = RELATIONSHIP_TYPES.filter(
  type => type.key !== 'main'
);

interface SecondaryEmergencyContactSectionProps {
  emergencyContactData: EmergencyContactData;
  onUpdateEmergencyContactData: (_data: Partial<EmergencyContactData>) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export const SecondaryEmergencyContactSection: React.FC<
  SecondaryEmergencyContactSectionProps
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
    'secondaryName',
    'secondaryPhone',
    'secondaryEmail',
    'secondaryRelationship',
  ];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  const getFormattedPhoneDisplay = () => {
    if (!formValues?.secondaryPhone) return 'Not provided';
    const country =
      countryCodes.find(c => c.code === formValues.secondaryCountryCode) ||
      countryCodes[0];
    return `${country.dial_code} ${formValues.secondaryPhone}`;
  };

  return (
    <View className="mb-6">
      <View className="bg-white rounded-xl border-b border-gray-100">
        <View className="flex-row items-center justify-between p-6 pb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="account-plus"
                size={22}
                color="#3B82F6"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Secondary Contact
              </Text>
              <Text className="text-sm text-gray-600">
                Backup contact person (optional)
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
                name="secondaryName"
                rules={emergencyContactValidationRules.secondaryName}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field="secondaryName"
                    value={value}
                    label="Full Name"
                    placeholder="Robert Johnson"
                    isActive={selectedInput === 'secondaryName'}
                    borderColor={
                      error ? '#EF4444' : getBorderColor('secondaryName')
                    }
                    labelStyle={getLabelStyle('secondaryName')}
                    onFocus={() => handleFocus('secondaryName')}
                    onBlur={() => {
                      handleBlur('secondaryName');
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
              name="secondaryCountryCode"
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
                name="secondaryCountryCode"
                render={({ field: { value: countryCodeValue } }) => {
                  const selectedCountry =
                    countryCodes.find(c => c.code === countryCodeValue) ||
                    countryCodes[0];

                  return (
                    <Controller
                      name="secondaryPhone"
                      rules={{
                        required: 'Secondary contact phone number is required',
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
                            field="secondaryPhone"
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
                            isActive={selectedInput === 'secondaryPhone'}
                            borderColor={
                              error
                                ? '#EF4444'
                                : getBorderColor('secondaryPhone')
                            }
                            labelStyle={getLabelStyle('secondaryPhone')}
                            onFocus={() => handleFocus('secondaryPhone')}
                            onBlur={() => {
                              handleBlur('secondaryPhone');
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
                name="secondaryEmail"
                rules={emergencyContactValidationRules.secondaryEmail}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field="secondaryEmail"
                    value={value}
                    label="Email Address (Optional)"
                    placeholder="robert.johnson@example.com"
                    isActive={selectedInput === 'secondaryEmail'}
                    borderColor={
                      error ? '#EF4444' : getBorderColor('secondaryEmail')
                    }
                    labelStyle={getLabelStyle('secondaryEmail')}
                    onFocus={() => handleFocus('secondaryEmail')}
                    onBlur={() => {
                      handleBlur('secondaryEmail');
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
                name="secondaryRelationship"
                rules={emergencyContactValidationRules.secondaryRelationship}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <View>
                    <SingleDropdown
                      field="secondaryRelationship"
                      value={value}
                      options={EMERGENCY_CONTACT_RELATIONSHIP_TYPES}
                      onValueChange={onChange}
                      label="Relationship"
                      placeholder="Select relationship"
                      isActive={selectedInput === 'secondaryRelationship'}
                      borderColor={
                        error
                          ? '#EF4444'
                          : getBorderColor('secondaryRelationship')
                      }
                      labelStyle={getLabelStyle('secondaryRelationship')}
                      onFocus={() => handleFocus('secondaryRelationship')}
                      onBlur={() => {
                        handleBlur('secondaryRelationship');
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
                  {isSaving ? 'Saving...' : 'Save Secondary Contact'}
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
                  {formValues?.secondaryName || 'Not provided'}
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
                  {formValues?.secondaryEmail || 'Not provided'}
                </Text>
              </View>

              <View className="mt-4">
                <Text className="text-sm text-gray-500 mb-1">Relationship</Text>
                <Text className="text-base text-gray-900">
                  {EMERGENCY_CONTACT_RELATIONSHIP_TYPES.find(
                    type => type.key === formValues?.secondaryRelationship
                  )?.value ||
                    formValues?.secondaryRelationship ||
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
