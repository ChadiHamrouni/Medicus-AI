import React, { useMemo, useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { FormFieldWrapper, Button } from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { RELATIONSHIP_TYPES } from '@/constants';
import { formatPhoneNumber, getCountryFromLocation } from '@/utils';
import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';
import {
  DropdownOption,
  UnifiedDropdown,
} from '@/components/shared/ui/Form/UnifiedDropdown';

const EMERGENCY_CONTACT_RELATIONSHIP_TYPES = RELATIONSHIP_TYPES.filter(
  type => type.key !== 'main'
).map(type => ({
  ...type,
  label: type.value,
}));

export interface EmergencyContactSectionProps {
  type: 'primary' | 'secondary';
  readOnly?: boolean;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  fieldNames: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    countryCode: string;
  };
  validationRules: {
    name: any;
    email: any;
    relationship: any;
  };
}

export const EmergencyContactSection: React.FC<
  EmergencyContactSectionProps
> = ({
  title,
  subtitle,
  icon,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving,
  fieldNames,
  validationRules,
  readOnly,
}) => {
    const {
      watch,
      formState: { dirtyFields, errors },
    } = useFormContext();
    const formValues = watch();

    // Check if any field in this section has changes
    const hasChanges = useMemo(() => {
      // Check each field name against dirtyFields
      return Object.values(fieldNames).some(fieldName => dirtyFields[fieldName]);
    }, [dirtyFields, fieldNames]);

    // Check if the section is valid by checking both errors AND presence of required fields
    // This is needed because RHF errors might not be populated for untouched required fields
    const sectionIsValid = useMemo(() => {
      // 1. Check if any reported errors exist
      const hasReportedErrors = Object.values(fieldNames).some(
        fieldName => errors[fieldName]
      );
      if (hasReportedErrors) return false;

      // 2. Check required fields have values
      // Emergency Contacts strictly require Name, Phone, and Relationship
      const nameVal = formValues?.[fieldNames.name];
      const phoneVal = formValues?.[fieldNames.phone];
      const relationVal = formValues?.[fieldNames.relationship];

      // Helper to check emptiness
      const isEmpty = (val: string | undefined | null) =>
        !val || (typeof val === 'string' && val.trim() === '');

      if (isEmpty(nameVal)) return false;
      if (isEmpty(phoneVal)) return false;
      if (isEmpty(relationVal)) return false;

      return true;
    }, [errors, fieldNames, formValues]);

    const shouldShowSave = hasChanges && sectionIsValid;

    useEffect(() => {
      const detectCountry = async () => {
        const currentCountryCode = formValues?.[fieldNames.countryCode];
        if (!currentCountryCode || currentCountryCode === 'US') {
          const detectedCountryCode = await getCountryFromLocation();
          if (detectedCountryCode && detectedCountryCode !== currentCountryCode) {
            const setValue = (watch as any).setValue;
            if (setValue) {
              setValue(fieldNames.countryCode, detectedCountryCode);
            }
          }
        }
      };

      if (isEditing) {
        detectCountry();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing, fieldNames.countryCode]);

    const formFields = [
      fieldNames.name,
      fieldNames.phone,
      fieldNames.email,
      fieldNames.relationship,
    ];
    const {
      selectedInput,
      getBorderColor,
      getLabelStyle,
      handleFocus,
      handleBlur,
    } = useAnimatedFormField(formFields, 'white');

    const getFormattedPhoneDisplay = () => {
      if (!formValues?.[fieldNames.phone]) return 'Not provided';
      const country =
        countryCodes.find(c => c.code === formValues[fieldNames.countryCode]) ||
        countryCodes[0];
      return `${country.dial_code} ${formValues[fieldNames.phone]}`;
    };

    const countryOptions = useMemo(() => {
      return countryCodes.map(c => ({
        key: c.code,
        value: c.code,
        label: c.name,
        icon: c.flag,
        description: c.dial_code,
      }));
    }, []);

    const renderCountryTrigger = (
      selectedOptions: DropdownOption | DropdownOption[] | null,
      placeholder: string,
      isOpen: boolean
    ) => {
      const selected = Array.isArray(selectedOptions)
        ? selectedOptions[0]
        : selectedOptions;
      const country =
        countryCodes.find(c => c.code === selected?.key) || countryCodes[0];

      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            paddingHorizontal: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>{country.flag}</Text>
            <Text
              style={{
                fontSize: 16,
                color: selected ? '#111827' : '#9CA3AF',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {selected ? `${country.name} ${country.dial_code}` : placeholder}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={isOpen ? '#F05C0C' : '#9CA3AF'}
              style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
            />
          </View>
        </View>
      );
    };

    return (
      <View className="mb-6">
        <View className="bg-white rounded-xl border-b border-gray-100">
          <View className="flex-row items-center justify-between p-6 pb-4">
            <View className="flex-row items-center flex-1">
              <MaterialCommunityIcons
                name={icon}
                size={28}
                color="#F05C0C"
                style={{ marginRight: 12 }}
              />
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {title}
                </Text>
                <Text className="text-sm text-gray-600">{subtitle}</Text>
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
              <View className="mb-4">
                <Controller
                  name={fieldNames.name}
                  rules={validationRules.name}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={fieldNames.name}
                      value={value}
                      label="Full Name"
                      placeholder="Jane Smith"
                      isActive={selectedInput === fieldNames.name}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(fieldNames.name)
                      }
                      labelStyle={getLabelStyle(fieldNames.name)}
                      onFocus={() => handleFocus(fieldNames.name)}
                      onBlur={() => {
                        handleBlur(fieldNames.name);
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
                name={fieldNames.countryCode}
                render={({
                  field: {
                    value: countryCodeValue,
                    onChange: onCountryCodeChange,
                  },
                }) => (
                  <View className="mb-4">
                    <UnifiedDropdown
                      label="Country"
                      options={countryOptions}
                      value={countryCodeValue}
                      onValueChange={val => onCountryCodeChange(val as string)}
                      searchable
                      searchPlaceholder="Search country or code..."
                      renderTrigger={renderCountryTrigger}
                      dropdownStyle={{
                        height: 56,
                        borderColor: '#E5E7EB',
                        borderWidth: 2,
                      }}
                      backgroundColor="white"
                    />
                  </View>
                )}
              />

              {/* Phone number input */}
              <View className="mb-4">
                <Controller
                  name={fieldNames.phone}
                  rules={{
                    required: 'Phone number is required',
                    validate: (value: string) => {
                      if (!value || value.trim().length === 0) {
                        return 'Phone number is required';
                      }

                      const currentCountryCode =
                        formValues?.[fieldNames.countryCode] || 'US';
                      const selectedCountry =
                        countryCodes.find(c => c.code === currentCountryCode) ||
                        countryCodes[0];

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
                    const currentCountryCode =
                      formValues?.[fieldNames.countryCode] || 'US';
                    const selectedCountry =
                      countryCodes.find(c => c.code === currentCountryCode) ||
                      countryCodes[0];

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
                        field={fieldNames.phone}
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
                        isActive={selectedInput === fieldNames.phone}
                        borderColor={
                          error ? '#EF4444' : getBorderColor(fieldNames.phone)
                        }
                        labelStyle={getLabelStyle(fieldNames.phone)}
                        onFocus={() => handleFocus(fieldNames.phone)}
                        onBlur={() => {
                          handleBlur(fieldNames.phone);
                          onBlur();
                          // Force trigger validation on blur to ensure error state matches
                          // trigger(fieldNames.phone);
                        }}
                      />
                    );
                  }}
                />
              </View>

              <View className="mb-4">
                <Controller
                  name={fieldNames.email}
                  rules={validationRules.email}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={fieldNames.email}
                      value={value}
                      label="Email Address (Optional)"
                      placeholder="jane.smith@example.com"
                      isActive={selectedInput === fieldNames.email}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(fieldNames.email)
                      }
                      labelStyle={getLabelStyle(fieldNames.email)}
                      onFocus={() => handleFocus(fieldNames.email)}
                      onBlur={() => {
                        handleBlur(fieldNames.email);
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
                  name={fieldNames.relationship}
                  rules={validationRules.relationship}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <View>
                      <UnifiedDropdown
                        label="Relationship"
                        placeholder="Select relationship"
                        value={value}
                        options={EMERGENCY_CONTACT_RELATIONSHIP_TYPES}
                        onValueChange={val => onChange(val)}
                        onFocus={() => handleFocus(fieldNames.relationship)}
                        onBlur={() => {
                          handleBlur(fieldNames.relationship);
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
                    title={isSaving ? 'Saving...' : `Save ${title}`}
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
              <View>
                <View>
                  <Text className="text-sm text-gray-500 mb-1">Full Name</Text>
                  <Text className="text-base text-gray-900">
                    {formValues?.[fieldNames.name] || 'Not provided'}
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
                    {formValues?.[fieldNames.email] || 'Not provided'}
                  </Text>
                </View>

                <View className="mt-4">
                  <Text className="text-sm text-gray-500 mb-1">Relationship</Text>
                  <Text className="text-base text-gray-900">
                    {RELATIONSHIP_TYPES.find(
                      type => type.key === formValues?.[fieldNames.relationship]
                    )?.value ||
                      formValues?.[fieldNames.relationship] ||
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
