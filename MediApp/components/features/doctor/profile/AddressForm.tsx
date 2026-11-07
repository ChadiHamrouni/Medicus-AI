import {
  FormFieldWrapper,
  StandardBottomButton,
  ThreeDotsLoader,
} from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDoctorProfile } from '@/hooks/doctor';
import { DoctorLocation, DoctorProfileResponse } from '@/types';
import { getDoctorPublicProfile } from '@/services/doctor/profile';
import { logger } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from 'react-native';

const openMap = (address: DoctorLocation) => {
  const fullAddress = `${address.address_line_1}, ${address.city}, ${address.state} ${address.zip_code}`;
  const url = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(fullAddress)}`,
    android: `geo:0,0?q=${encodeURIComponent(fullAddress)}`,
  });

  if (url) {
    Linking.openURL(url).catch(err => {
      logger.error('Failed to open map', err as Error, {
        component: 'AddressForm',
        address: fullAddress,
      });
      Alert.alert('Error', 'Could not open map application.');
    });
  }
};


import { useForm, Controller, useFieldArray } from 'react-hook-form';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

type AddressFormData = {
  addresses: DoctorLocation[];
};

const addressValidationRules = {
  location_name: {
    required: 'Location name is required',
    minLength: {
      value: 2,
      message: 'Location name must be at least 2 characters',
    },
  },
  address_line_1: {
    required: 'Address line 1 is required',
    minLength: {
      value: 5,
      message: 'Address must be at least 5 characters',
    },
  },
  city: {
    required: 'City is required',
    minLength: {
      value: 2,
      message: 'City must be at least 2 characters',
    },
  },
  state: {
    required: 'State is required',
    minLength: {
      value: 2,
      message: 'State must be at least 2 characters',
    },
  },
  zip_code: {
    required: 'ZIP code is required',
    pattern: {
      value: /^\d{4}(-\d{4})?$/,
      message: 'Please enter a valid ZIP code (1234 or 1234-6789)',
    },
  },
};

interface AddressFormProps {
  readOnly?: boolean;
  doctorId?: number; // For viewing another doctor's profile
}

export const AddressForm: React.FC<AddressFormProps> = ({
  readOnly = false,
  doctorId,
}) => {
  const { profile: ownProfile, updateLocations, isUpdatingLocations, isLoading, refetch, error } =
    useDoctorProfile();

  // State for viewing another doctor's profile
  const [viewedDoctorProfile, setViewedDoctorProfile] = useState<DoctorProfileResponse | null>(null);
  const [isLoadingViewed, setIsLoadingViewed] = useState(false);

  // Determine which profile to use
  const isViewingOtherDoctor = readOnly && doctorId;
  const profile = isViewingOtherDoctor ? viewedDoctorProfile : ownProfile;

  // Fetch the viewed doctor's profile when doctorId is provided
  useEffect(() => {
    if (isViewingOtherDoctor && doctorId) {
      const fetchViewedDoctor = async () => {
        setIsLoadingViewed(true);
        try {
          const fetchedProfile = await getDoctorPublicProfile(doctorId);
          setViewedDoctorProfile(fetchedProfile);
        } catch (err) {
          logger.error('Failed to fetch viewed doctor profile', err as Error, {
            component: 'AddressForm',
            doctorId,
          });
        } finally {
          setIsLoadingViewed(false);
        }
      };
      fetchViewedDoctor();
    }
  }, [isViewingOtherDoctor, doctorId]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<AddressFormData>({
    defaultValues: {
      addresses: [
        {
          location_name: 'Primary Clinic',
          address_line_1: '',
          address_line_2: '',
          city: '',
          state: '',
          zip_code: '',
          is_primary: true,
        },
      ],
    },
    mode: 'onChange',
  });

  const { append, remove } = useFieldArray({
    control,
    name: 'addresses',
  });

  const watchedAddresses = watch('addresses');

  useEffect(() => {
    if (profile?.other_locations && profile.other_locations.length > 0) {
      const locationsData = profile.other_locations.map((loc: any) => ({
        id: loc.id,
        location_name: loc.location_name || 'Clinic',
        address_line_1: loc.address_line_1 || '',
        address_line_2: loc.address_line_2 || '',
        city: loc.city || '',
        state: loc.state || '',
        zip_code: loc.zip_code || '',
        is_primary: loc.is_primary || false,
      }));

      setValue('addresses', locationsData);
      reset({ addresses: locationsData });
      logger.info('AddressForm populated with profile data', {
        component: 'AddressForm',
        addressesCount: locationsData.length,
      });
    } else if (
      profile &&
      (!profile.other_locations || profile.other_locations.length === 0)
    ) {
      logger.info(
        'AddressForm keeping default address - no locations in profile',
        {
          component: 'AddressForm',
        }
      );
    }
  }, [profile, setValue, reset]);

  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    await refetch(true);
    setIsRetrying(false);
  }, [refetch]);

  const formFields = watchedAddresses.flatMap((_: any, idx: number) => [
    `location_name_${idx}`,
    `address_line_1_${idx}`,
    `address_line_2_${idx}`,
    `city_${idx}`,
    `state_${idx}`,
    `zip_code_${idx}`,
  ]);

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  const addAddress = () => {
    const lastAddress = watchedAddresses[watchedAddresses.length - 1];
    if (
      !lastAddress.location_name.trim() ||
      !lastAddress.address_line_1.trim() ||
      !lastAddress.city.trim() ||
      !lastAddress.state.trim() ||
      !lastAddress.zip_code.trim()
    ) {
      Alert.alert(
        'Incomplete Address',
        'Please fill in all required fields of the current address before adding a new one.'
      );
      return;
    }

    const newAddress: DoctorLocation = {
      location_name: `Location ${watchedAddresses.length + 1}`,
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      zip_code: '',
      is_primary: false,
    };
    append(newAddress);
  };

  const removeAddress = (index: number) => {
    if (watchedAddresses.length === 1) {
      Alert.alert('Cannot Remove', 'You must have at least one address');
      return;
    }

    Alert.alert(
      'Remove Address',
      'Are you sure you want to remove this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            remove(index);
          },
        },
      ]
    );
  };

  const onSubmit = useCallback(
    async (data: AddressFormData) => {
      try {
        const hasValidAddress = data.addresses.some(
          addr =>
            addr.address_line_1.trim() &&
            addr.city.trim() &&
            addr.state.trim() &&
            addr.zip_code.trim()
        );

        if (!hasValidAddress) {
          Alert.alert(
            'Validation Error',
            'Please fill in at least one complete address'
          );
          return;
        }

        await updateLocations(data.addresses);

        Alert.alert('Success', 'Addresses updated successfully!');

        reset(data);
      } catch (error: any) {
        const errorMessage =
          error?.message || 'Failed to update addresses. Please try again.';
        Alert.alert('Error', errorMessage);
        logger.error('Update error:', error as Error, {
          component: 'AddressForm',
        });
      }
    },
    [updateLocations, reset]
  );

  if ((isLoading && !profile) || isRetrying || isLoadingViewed) {
    return (
      <View className="flex-1 items-center justify-center py-20 px-4">
        <ThreeDotsLoader size={24} />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View className="flex-1 items-center justify-center py-20 px-4">
        <Text className="text-center text-gray-700 font-semibold text-base mb-4">
          An error occurred while fetching your addresses.
        </Text>
        <Text
          className="text-center text-orange-600 font-semibold"
          onPress={handleRetry}
        >
          Tap to retry
        </Text>
      </View>
    );
  }

  // Read-only view - plain text display
  if (readOnly) {
    return null;
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 py-6">
          {/* Address List */}
          {watchedAddresses.map((address: DoctorLocation, index: number) => (
            <View
              key={index}
              className={`mb-6 p-6 border-b border-gray-200 rounded-lg bg-white relative`}
            >
              {watchedAddresses.length > 1 && !readOnly && (
                <TouchableOpacity
                  onPress={() => removeAddress(index)}
                  className="absolute -top-3 -right-3 bg-white rounded-full border border-gray-300 p-1"
                  style={{ zIndex: 10 }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              )}

              {address.is_primary ? (
                <View className="flex-row items-center mb-4 pb-3 ">
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={24}
                    color="#F05C0C"
                  />
                  <Text className="ml-2 text-lg font-semibold text-gray-800">
                    Primary Location
                  </Text>
                </View>
              ) : (
                <></>
              )}

              <View className="mb-4">
                <Controller
                  control={control}
                  name={`addresses.${index}.location_name`}
                  rules={addressValidationRules.location_name}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={`location_name_${index}`}
                      label="Location Name"
                      placeholder="e.g., Main Clinic, Downtown Office"
                      value={value}
                      onChangeText={onChange}
                      isActive={selectedInput === `location_name_${index}`}
                      borderColor={
                        error
                          ? '#EF4444'
                          : getBorderColor(`location_name_${index}`)
                      }
                      labelStyle={getLabelStyle(`location_name_${index}`)}
                      onFocus={() => handleFocus(`location_name_${index}`)}
                      onBlur={() => {
                        onBlur();
                        handleBlur(`location_name_${index}`);
                      }}
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>

              <View className="mb-4">
                <Controller
                  control={control}
                  name={`addresses.${index}.address_line_1`}
                  rules={addressValidationRules.address_line_1}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={`address_line_1_${index}`}
                      label="Address Line 1"
                      placeholder="123 Medical Center Dr"
                      value={value}
                      onChangeText={onChange}
                      isActive={selectedInput === `address_line_1_${index}`}
                      borderColor={
                        error
                          ? '#EF4444'
                          : getBorderColor(`address_line_1_${index}`)
                      }
                      labelStyle={getLabelStyle(`address_line_1_${index}`)}
                      onFocus={() => handleFocus(`address_line_1_${index}`)}
                      onBlur={() => {
                        onBlur();
                        handleBlur(`address_line_1_${index}`);
                      }}
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>

              <View className="mb-4">
                <Controller
                  control={control}
                  name={`addresses.${index}.address_line_2`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormFieldWrapper
                      type="text"
                      field={`address_line_2_${index}`}
                      label="Address Line 2 (Optional)"
                      placeholder="Suite 100"
                      value={value || ''}
                      onChangeText={onChange}
                      isActive={selectedInput === `address_line_2_${index}`}
                      borderColor={getBorderColor(`address_line_2_${index}`)}
                      labelStyle={getLabelStyle(`address_line_2_${index}`)}
                      onFocus={() => handleFocus(`address_line_2_${index}`)}
                      onBlur={() => {
                        onBlur();
                        handleBlur(`address_line_2_${index}`);
                      }}
                    />
                  )}
                />
              </View>

              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <Controller
                    control={control}
                    name={`addresses.${index}.city`}
                    rules={addressValidationRules.city}
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <FormFieldWrapper
                        type="text"
                        field={`city_${index}`}
                        label="City"
                        placeholder="City"
                        value={value}
                        onChangeText={onChange}
                        isActive={selectedInput === `city_${index}`}
                        borderColor={
                          error ? '#EF4444' : getBorderColor(`city_${index}`)
                        }
                        labelStyle={getLabelStyle(`city_${index}`)}
                        onFocus={() => handleFocus(`city_${index}`)}
                        onBlur={() => {
                          onBlur();
                          handleBlur(`city_${index}`);
                        }}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </View>

                <View className="flex-1 ml-2">
                  <Controller
                    control={control}
                    name={`addresses.${index}.state`}
                    rules={addressValidationRules.state}
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <FormFieldWrapper
                        type="text"
                        field={`state_${index}`}
                        label="State"
                        placeholder="State"
                        value={value}
                        onChangeText={onChange}
                        isActive={selectedInput === `state_${index}`}
                        borderColor={
                          error ? '#EF4444' : getBorderColor(`state_${index}`)
                        }
                        labelStyle={getLabelStyle(`state_${index}`)}
                        onFocus={() => handleFocus(`state_${index}`)}
                        onBlur={() => {
                          onBlur();
                          handleBlur(`state_${index}`);
                        }}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <View>
                <Controller
                  control={control}
                  name={`addresses.${index}.zip_code`}
                  rules={addressValidationRules.zip_code}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="text"
                      field={`zip_code_${index}`}
                      label="ZIP Code"
                      placeholder="12345"
                      value={value}
                      onChangeText={onChange}
                      isActive={selectedInput === `zip_code_${index}`}
                      borderColor={
                        error ? '#EF4444' : getBorderColor(`zip_code_${index}`)
                      }
                      labelStyle={getLabelStyle(`zip_code_${index}`)}
                      onFocus={() => handleFocus(`zip_code_${index}`)}
                      onBlur={() => {
                        onBlur();
                        handleBlur(`zip_code_${index}`);
                      }}
                      keyboardType="numeric"
                      errorMessage={error?.message}
                    />
                  )}
                />
              </View>
            </View>
          ))}

          {/* Add Address Button - Same style as Add Time Slot */}
          {!readOnly && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={addAddress}
              className="flex-row items-center justify-center p-4 border border-gray-200 rounded-lg mb-4 bg-white"
            >
              <MaterialCommunityIcons name="plus" size={24} color="gray" />
              <Text className="ml-2 text-gray-700">Add Address</Text>
            </TouchableOpacity>
          )}

          {/* Bottom Spacing */}
          <View className="h-32" />
        </View>
      </ScrollView>
      {!readOnly && (isDirty || isUpdatingLocations) && (
        <Animated.View
          entering={FadeInUp.duration(300)}
          exiting={FadeOutDown.duration(200)}
          className="absolute bottom-4 left-4 right-4 mb-4 pb-4"
        >
          <StandardBottomButton
            onPress={handleSubmit(onSubmit)}
            label="Save Addresses"
            isLoading={isUpdatingLocations}
            isDisabled={isUpdatingLocations}
          />
        </Animated.View>
      )}
    </View>
  );
};
