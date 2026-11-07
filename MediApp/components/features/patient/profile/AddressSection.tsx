import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { FormFieldWrapper } from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { validationRules, ContactFormData } from '@/utils';
import type { ContactData } from '@/stores/patientStore';

interface AddressSectionProps {
  contactData: ContactData;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export const AddressSection: React.FC<AddressSectionProps> = ({
  contactData,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving,
}) => {
  const { control } = useFormContext<ContactFormData>();
  const formFields = ['address', 'city', 'state', 'zipCode'];
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
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="map-marker"
                size={22}
                color="#3B82F6"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Residential Address
              </Text>
              <Text className="text-sm text-gray-600">
                Your primary home address
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
                control={control}
                name="address"
                rules={validationRules.address}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field="address"
                    value={value}
                    label="Street Address"
                    placeholder="123 Main Street"
                    isActive={selectedInput === 'address'}
                    borderColor={error ? '#EF4444' : getBorderColor('address')}
                    labelStyle={getLabelStyle('address')}
                    onFocus={() => handleFocus('address')}
                    onBlur={() => {
                      handleBlur('address');
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

            <View className="flex-row mb-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="city"
                  rules={validationRules.city}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field="city"
                      value={value}
                      label="City"
                      placeholder="New York"
                      isActive={selectedInput === 'city'}
                      borderColor={error ? '#EF4444' : getBorderColor('city')}
                      labelStyle={getLabelStyle('city')}
                      onFocus={() => handleFocus('city')}
                      onBlur={() => {
                        handleBlur('city');
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
                  name="state"
                  rules={validationRules.state}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field="state"
                      value={value}
                      label="State"
                      placeholder="NY"
                      isActive={selectedInput === 'state'}
                      borderColor={error ? '#EF4444' : getBorderColor('state')}
                      labelStyle={getLabelStyle('state')}
                      onFocus={() => handleFocus('state')}
                      onBlur={() => {
                        handleBlur('state');
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

            <View className="mb-6">
              <Controller
                control={control}
                name="zipCode"
                rules={validationRules.zipCode}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field="zipCode"
                    value={value}
                    label="ZIP Code"
                    placeholder="10001"
                    isActive={selectedInput === 'zipCode'}
                    borderColor={error ? '#EF4444' : getBorderColor('zipCode')}
                    labelStyle={getLabelStyle('zipCode')}
                    onFocus={() => handleFocus('zipCode')}
                    onBlur={() => {
                      handleBlur('zipCode');
                      onBlur();
                    }}
                    onChangeText={text => {
                      onChange(text);
                    }}
                    keyboardType="numeric"
                    errorMessage={error?.message}
                  />
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
                  {isSaving ? 'Saving...' : 'Save Address'}
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
              <View>
                <Text className="text-sm text-gray-500 mb-1">
                  Street Address
                </Text>
                <Text className="text-base text-gray-900">
                  {String(contactData.address || 'Not provided')}
                </Text>
              </View>

              <View className="flex-row mt-4" style={{ gap: 16 }}>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">City</Text>
                  <Text className="text-base text-gray-900">
                    {String(contactData.city || 'Not provided')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">State</Text>
                  <Text className="text-base text-gray-900">
                    {String(contactData.state || 'Not provided')}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-sm text-gray-500 mb-1">ZIP Code</Text>
                <Text className="text-base text-gray-900">
                  {String(contactData.zipCode || 'Not provided')}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};
