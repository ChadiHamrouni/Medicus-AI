import React, { useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Controller, useFormContext } from 'react-hook-form';
import {
  Button,
  Card,
  DropdownOption,
  UnifiedDropdown,
  FormFieldWrapper,
} from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useCountriesQuery } from '@/hooks/doctor/queries/useDoctorProfileQueries';
import { ContactFormData } from '@/utils';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

interface AddressSectionProps {
  // contactData: ContactData; // Removed
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  fieldNames: Record<string, string>;
  validationRules: Record<string, any>;
  readOnly?: boolean;
}

export const AddressSection: React.FC<AddressSectionProps> = ({
  // contactData, // Removed
  isEditing,
  onToggleEdit,
  onSave,
  isSaving,
  fieldNames,
  validationRules,
  readOnly,
}) => {
  // Use React Query hook for cached countries data
  const { data: countriesData, isLoading: countriesLoading } = useCountriesQuery();
  const countries = countriesData?.countries || [];

  const {
    control,
    watch,
    formState: { dirtyFields, errors },
  } = useFormContext<ContactFormData>();
  const formFields = useMemo(
    () => [
      fieldNames.street,
      fieldNames.city,
      fieldNames.state,
      fieldNames.zipCode,
      fieldNames.country,
    ],
    [fieldNames]
  );

  // Calculate if any field in this section has changes
  const hasChanges = useMemo(() => {
    return Object.values(fieldNames).some(
      fieldName => dirtyFields[fieldName as keyof ContactFormData]
    );
  }, [dirtyFields, fieldNames]);

  // Calculate if any field in this section has errors
  const hasErrors = useMemo(() => {
    return Object.values(fieldNames).some(
      fieldName => errors[fieldName as keyof ContactFormData]
    );
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

  // Helper function to get country name from ID
  // Uses denormalized country_name from form data if available (from address JSON)
  const getCountryName = (countryId: string | undefined, countryName?: string) => {
    if (!countryId) return 'Not provided';

    // If we have the denormalized country name from address JSON, use it immediately
    if (countryName) return countryName;

    // Try to find the country in the loaded list
    const country = countries.find(c => c.id.toString() === countryId);

    // If found, return the name immediately (this is instant after first cache)
    if (country) return country.name;

    // If not loading anymore and still not found, country doesn't exist
    if (!countriesLoading) return 'Not provided';

    // Still loading on first visit - countries will load from cache instantly on subsequent visits
    // Don't show "Loading..." as it flickers - countries load fast from cache
    return 'Not provided';
  };

  const countryOptions = useMemo(
    () =>
      countries.map(country => ({
        key: country.id.toString(),
        value: country.id.toString(), // store country ID as string for dropdown
        label: country.name,          // display name
        icon: '',                     // no flag for backend countries
        metadata: country,
      })),
    [countries]
  );

  return (
    <View className="mb-6">
      <View className="p-0">
        <View className="flex-row items-center justify-between p-6 pb-4">
          <View className="flex-row items-center flex-1">
            <MaterialCommunityIcons
              name="map-marker"
              size={28}
              color="#F05C0C"
              style={{ marginRight: 12 }}
            />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Address
              </Text>
              <Text className="text-sm text-gray-600">
                Primary residence location
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
            <View className="mb-4">
              <Controller
                control={control}
                name={fieldNames.street as any}
                rules={validationRules.street}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field={fieldNames.street as any}
                    value={value}
                    label="Street Address"
                    placeholder="123 Main Street"
                    isActive={selectedInput === fieldNames.street}
                    borderColor={
                      error ? '#EF4444' : getBorderColor(fieldNames.street)
                    }
                    labelStyle={getLabelStyle(fieldNames.street)}
                    onFocus={() => handleFocus(fieldNames.street)}
                    onBlur={() => {
                      handleBlur(fieldNames.street);
                      onBlur();
                    }}
                    onChangeText={onChange}
                    errorMessage={error?.message}
                  />
                )}
              />
            </View>

            <View className="flex-row mb-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={fieldNames.city as any}
                  rules={validationRules.city}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={fieldNames.city as any}
                      value={value}
                      label="City"
                      placeholder="New York"
                      isActive={selectedInput === fieldNames.city}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(fieldNames.city)
                      }
                      labelStyle={getLabelStyle(fieldNames.city)}
                      onFocus={() => handleFocus(fieldNames.city)}
                      onBlur={() => {
                        handleBlur(fieldNames.city);
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
                  name={fieldNames.state as any}
                  rules={validationRules.state}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={fieldNames.state as any}
                      value={value}
                      label="State"
                      placeholder="NY"
                      isActive={selectedInput === fieldNames.state}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(fieldNames.state)
                      }
                      labelStyle={getLabelStyle(fieldNames.state)}
                      onFocus={() => handleFocus(fieldNames.state)}
                      onBlur={() => {
                        handleBlur(fieldNames.state);
                        onBlur();
                      }}
                      onChangeText={onChange}
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>
            </View>

            <View className="flex-row mb-6" style={{ gap: 16 }}>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={fieldNames.zipCode as any}
                  rules={validationRules.zipCode}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={fieldNames.zipCode as any}
                      value={value}
                      label="ZIP Code"
                      placeholder="10001"
                      isActive={selectedInput === fieldNames.zipCode}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(fieldNames.zipCode)
                      }
                      labelStyle={getLabelStyle(fieldNames.zipCode)}
                      onFocus={() => handleFocus(fieldNames.zipCode)}
                      onBlur={() => {
                        handleBlur(fieldNames.zipCode);
                        onBlur();
                      }}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={fieldNames.country as any}
                  rules={validationRules.country}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <View>
                      <UnifiedDropdown
                        label="Country"
                        placeholder={countriesLoading ? "Loading countries..." : "Select country"}
                        value={value}
                        options={countryOptions}
                        onValueChange={val => onChange(val)}
                        onFocus={() => handleFocus(fieldNames.country)}
                        onBlur={() => {
                          handleBlur(fieldNames.country);
                          onBlur();
                        }}
                        searchable
                        searchPlaceholder="Search country..."
                        error={error?.message}
                        backgroundColor="white"
                        disabled={countriesLoading}
                      />
                    </View>
                  )}
                />
              </View>
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
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-1">Street Address</Text>
              <Text className="text-base text-gray-900">
                {String(
                  (formValues as any)?.[fieldNames.street] || 'Not provided'
                )}
              </Text>
            </View>

            <View className="flex-row mb-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">City</Text>
                <Text className="text-base text-gray-900">
                  {String(
                    (formValues as any)?.[fieldNames.city] || 'Not provided'
                  )}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">State</Text>
                <Text className="text-base text-gray-900">
                  {String(
                    (formValues as any)?.[fieldNames.state] || 'Not provided'
                  )}
                </Text>
              </View>
            </View>

            <View className="flex-row" style={{ gap: 16 }}>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">ZIP Code</Text>
                <Text className="text-base text-gray-900">
                  {String(
                    (formValues as any)?.[fieldNames.zipCode] || 'Not provided'
                  )}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Country</Text>
                <Text className="text-base text-gray-900">
                  {getCountryName(
                    (formValues as any)?.[fieldNames.country],
                    (formValues as any)?.country_name
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};
