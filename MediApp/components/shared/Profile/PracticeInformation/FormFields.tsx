import {
  FormFieldWrapper,
  UnifiedDropdown,
  DropdownOption,
  transformSpecialtyOptions,
  transformLanguageOptions,
  transformCountryOptions,
  transformPrefixOptions,
} from '@/components/shared/ui';
import { SPECIALTIES, PREFIXES } from '@/constants';
import {
  Country,
  PracticeInformationFormFieldKey as FormFieldKey,
  Language,
  Specialty,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

type FormFieldsProps = {
  formFields: FormFieldKey[];
  formData: Record<FormFieldKey, string>;
  selectedInput: FormFieldKey | null;
  selectedDropdown: string | null;
  getBorderColor: (_field: FormFieldKey) => string | any;
  getLabelStyle: (_field: FormFieldKey) => object;
  handleFocus: (_field: FormFieldKey) => void;
  handleBlur: (_field: FormFieldKey) => void;
  handleInputChange: (_field: FormFieldKey, _value: string) => void;
  isDropdownField: (_field: FormFieldKey) => boolean;
  isLocationField: (_field: FormFieldKey) => boolean;
  handleMapIconPress: (_field: FormFieldKey) => void;
  setSelectedDropdown: (_field: FormFieldKey | null) => void;
  // New props for dropdown data
  specialtiesData?: Specialty[];
  languagesData?: Language[];
  countriesData?: Country[];
  specialtiesLoading?: boolean;
  languagesLoading?: boolean;
  countriesLoading?: boolean;
};

export const FormFields: React.FC<FormFieldsProps> = ({
  formFields,
  formData,
  selectedInput,
  selectedDropdown,
  getBorderColor,
  getLabelStyle,
  handleFocus,
  handleBlur,
  handleInputChange,
  isDropdownField,
  isLocationField: _isLocationField,
  handleMapIconPress,
  setSelectedDropdown,
  specialtiesData = [],
  languagesData = [],
  countriesData = [],
  specialtiesLoading = false,
  languagesLoading = false,
  countriesLoading = false,
}) => {
  // Add state for country code
  const [countryCode, setCountryCode] = useState('TN');

  // Function to check if a field is a phone field
  const isPhoneField = (field: FormFieldKey): boolean => {
    return field === 'whatsappNumber';
  };

  // Function to check if a field should be disabled
  const isDisabledField = (field: FormFieldKey): boolean => {
    return [
      'licenseNumber',
      'first_name',
      'last_name',
      'specialty',
      'country',
    ].includes(field);
  };
  return (
    <View className="w-full max-w-md self-center">
      {formFields.map(field => (
        <View key={field} className="mb-6">
          {isPhoneField(field) ? (
            <FormFieldWrapper
              type="phone"
              field={field}
              value={formData[field]}
              label={
                field === 'whatsappNumber'
                  ? 'WhatsApp Number'
                  : field.charAt(0).toUpperCase() + field.slice(1)
              }
              isActive={selectedInput === field}
              borderColor={getBorderColor(field)}
              labelStyle={getLabelStyle(field)}
              onFocus={() => {
                handleFocus(field);
                setSelectedDropdown(null);
              }}
              onBlur={() => handleBlur(field)}
              onChangeText={text => handleInputChange(field, text)}
              onChangeCountry={code => setCountryCode(code)}
              selectedCountryCode={countryCode}
            />
          ) : field === 'prefix' ? (
            <UnifiedDropdown
              value={formData[field]}
              onValueChange={value => {
                if (typeof value === 'string') {
                  handleInputChange(field, value);
                }
              }}
              options={transformPrefixOptions(PREFIXES)}
              label="Title/Prefix"
              dropdownStyle={{ borderColor: getBorderColor(field) }}
              labelStyle={getLabelStyle(field)}
              onFocus={() => {
                setSelectedDropdown(field);
              }}
              onBlur={() => {
                setSelectedDropdown(null);
              }}
              isLoading={false}
              modalType="full-screen"
              searchable={true}
              clearable={true}
            />
          ) : field === 'specialty' ? (
            <UnifiedDropdown
              value={formData[field]}
              onValueChange={() => {}} // Disabled
              options={transformSpecialtyOptions(specialtiesData)}
              label="Medical Specialty"
              dropdownStyle={{ borderColor: getBorderColor(field) }}
              labelStyle={getLabelStyle(field)}
              onFocus={() => {}} // Disabled
              onBlur={() => {}} // Disabled
              isLoading={specialtiesLoading}
              disabled={true}
              modalType="full-screen"
              searchable={true}
            />
          ) : field === 'language' ? (
            <UnifiedDropdown
              value={formData[field]}
              onValueChange={(value, metadata) => {
                if (typeof value === 'string') {
                  handleInputChange(field, value);
                  // Also update the ID in form data
                  const option = metadata as DropdownOption;
                  if (option?.metadata?.id) {
                    handleInputChange(
                      'languageId' as FormFieldKey,
                      option.metadata.id.toString()
                    );
                  }
                }
              }}
              options={transformLanguageOptions(languagesData)}
              label="Preferred Language"
              dropdownStyle={{ borderColor: getBorderColor(field) }}
              labelStyle={getLabelStyle(field)}
              onFocus={() => {
                setSelectedDropdown(field);
              }}
              onBlur={() => {
                setSelectedDropdown(null);
              }}
              isLoading={languagesLoading}
              modalType="full-screen"
              searchable={true}
              clearable={true}
            />
          ) : field === 'country' ? (
            <UnifiedDropdown
              value={formData[field]}
              onValueChange={() => {}} // Disabled
              options={transformCountryOptions(countriesData)}
              label="Country"
              dropdownStyle={{ borderColor: getBorderColor(field) }}
              labelStyle={getLabelStyle(field)}
              onFocus={() => {}} // Disabled
              onBlur={() => {}} // Disabled
              isLoading={countriesLoading}
              disabled={true}
              modalType="full-screen"
              searchable={true}
            />
          ) : field === 'licenseNumber' ? (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2">License Number</Text>
              <View className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                <Text className="text-gray-600 text-base">
                  {formData[field]}
                </Text>
              </View>
            </View>
          ) : (
            <FormFieldWrapper
              type={isDropdownField(field) ? 'dropdown' : 'text'}
              field={field}
              value={formData[field]}
              label={(field.charAt(0).toUpperCase() + field.slice(1)).replace(
                '_',
                ' '
              )}
              isActive={
                isDropdownField(field)
                  ? selectedDropdown === field
                  : selectedInput === field
              }
              borderColor={getBorderColor(field)}
              labelStyle={getLabelStyle(field)}
              onFocus={() => {
                // Don't allow focus on disabled fields
                if (isDisabledField(field)) return;

                if (isDropdownField(field)) {
                  setSelectedDropdown(field);
                } else {
                  handleFocus(field);
                  setSelectedDropdown(null);
                }
              }}
              onBlur={() => {
                if (isDropdownField(field)) {
                  setSelectedDropdown(null);
                } else {
                  handleBlur(field);
                }
              }}
              onChangeText={
                isDisabledField(field)
                  ? () => {}
                  : text => handleInputChange(field, text)
              }
              options={
                isDropdownField(field)
                  ? SPECIALTIES.map(s => ({ key: s, value: s }))
                  : undefined
              }
              onValueChange={
                isDropdownField(field)
                  ? (value: string | string[]) => {
                      if (typeof value === 'string') {
                        handleInputChange(field, value);
                      }
                    }
                  : undefined
              }
              disabled={isDisabledField(field)}
              icon={
                field === 'addressLine1'
                  ? {
                      position: 'right',
                      component: (
                        <Ionicons name="location" size={24} color="#F05C0C" />
                      ),
                      onPress: () => handleMapIconPress(field),
                    }
                  : undefined
              }
            />
          )}
        </View>
      ))}
    </View>
  );
};
