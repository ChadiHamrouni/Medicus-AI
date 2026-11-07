import {
  FormFieldWrapper,
  StandardBottomButton,
  ThreeDotsLoader,
} from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDoctorProfile, useDoctorPublicProfile } from '@/hooks/doctor';
import { ContactInfo, DoctorProfileResponse, DoctorLocation } from '@/types';
import { logger } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View, Linking, Platform, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

// Form data type
type ContactFormData = {
  professionalEmail: string;
  professionalPhone: string;
  officePhone: string;
  faxNumber: string;
  websiteUrl: string;
};

// Validation rules
const validationRules = {
  professionalEmail: {
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  },
  professionalPhone: {
    pattern: {
      value: /^[\d\s\-\(\)\+]+$/,
      message: 'Please enter a valid phone number',
    },
  },
  officePhone: {
    pattern: {
      value: /^[\d\s\-\(\)\+]+$/,
      message: 'Please enter a valid phone number',
    },
  },
  faxNumber: {
    pattern: {
      value: /^[\d\s\-\(\)\+]+$/,
      message: 'Please enter a valid fax number',
    },
  },
  websiteUrl: {
    pattern: {
      value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      message: 'Please enter a valid website URL',
    },
  },
};

interface ProfessionalContactFormProps {
  readOnly?: boolean;
  doctorId?: number; // For viewing another doctor's profile
}

export const ProfessionalContactForm: React.FC<ProfessionalContactFormProps> = ({
  readOnly = false,
  doctorId,
}) => {
  const { profile: ownProfile, updateContactInfo, isUpdatingContactInfo, isLoading, refetch, error } =
    useDoctorProfile();

  // State for viewing another doctor's profile
  const isViewingOtherDoctor = readOnly && !!doctorId;
  const {
    data: viewedDoctorProfile,
    isLoading: isLoadingViewed
  } = useDoctorPublicProfile(isViewingOtherDoctor ? doctorId : undefined);

  // Determine which profile to use
  // const isViewingOtherDoctor = readOnly && doctorId;
  const profile = isViewingOtherDoctor ? viewedDoctorProfile || null : ownProfile;

  // Fetch detailed profile data on mount if contact info is missing
  // (LIGHT data from login doesn't include contact details, need DETAILED data)
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!isViewingOtherDoctor && !hasFetchedRef.current && ownProfile && !ownProfile.practice_email && !ownProfile.practice_phone && !ownProfile.fax_number) {
      hasFetchedRef.current = true;
      logger.info('Fetching detailed profile for contact info', {
        component: 'ProfessionalContactForm',
      });
      refetch(true);
    }
  }, [ownProfile, refetch, isViewingOtherDoctor]);

  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    await refetch(true);
    setIsRetrying(false);
  }, [refetch]);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isDirty },
  } = useForm<ContactFormData>({
    defaultValues: {
      professionalEmail: '',
      professionalPhone: '',
      officePhone: '',
      faxNumber: '',
      websiteUrl: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (
      profile &&
      (profile.practice_email ||
        profile.email ||
        profile.practice_phone ||
        profile.contact_cell_phone ||
        profile.fax_number ||
        profile.practice_website)
    ) {
      const profileData = {
        professionalEmail: profile.practice_email || profile.email || '',
        professionalPhone: profile.practice_phone || '',
        officePhone: profile.contact_cell_phone || '',
        faxNumber: profile.fax_number || '',
        websiteUrl: profile.practice_website || '',
      };

      setValue('professionalEmail', profileData.professionalEmail);
      setValue('professionalPhone', profileData.professionalPhone);
      setValue('officePhone', profileData.officePhone);
      setValue('faxNumber', profileData.faxNumber);
      setValue('websiteUrl', profileData.websiteUrl);

      reset(profileData);
      logger.info('ProfessionalContactForm populated with profile data', {
        component: 'ProfessionalContactForm',
        profileId: profile.id,
      });
    } else if (
      profile &&
      !profile.practice_email &&
      !profile.email &&
      !profile.practice_phone &&
      !profile.contact_cell_phone &&
      !profile.fax_number &&
      !profile.practice_website
    ) {
      logger.info(
        'ProfessionalContactForm keeping default values - no contact info in profile',
        {
          component: 'ProfessionalContactForm',
        }
      );
    }
  }, [profile, setValue, reset]);

  const formFields = [
    'professional_email',
    'professional_phone',
    'office_phone',
    'fax_number',
    'website_url',
  ];

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  const onSubmit = useCallback(
    async (data: ContactFormData) => {
      try {
        const contactData: ContactInfo = {
          professional_email: data.professionalEmail.trim() || undefined,
          professional_phone: data.professionalPhone.trim() || undefined,
          office_phone: data.officePhone.trim() || undefined,
          fax_number: data.faxNumber.trim() || undefined,
          website_url: data.websiteUrl.trim() || undefined,
        };

        await updateContactInfo(contactData);

        Alert.alert('Success', 'Contact information updated successfully!');

        reset(data);
      } catch (error: any) {
        const errorMessage =
          error?.message ||
          'Failed to update contact information. Please try again.';
        Alert.alert('Error', errorMessage);
        logger.error('Update error:', error as Error, {
          component: 'ProfessionalContactForm',
        });
      }
    },
    [updateContactInfo, reset]
  );

  const handleSave = handleSubmit(onSubmit);

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
          An error occurred while fetching your contact information.
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

  // Helper to render contact row in readOnly mode
  const renderContactRow = (label: string, value: string | undefined, icon: string) => {
    if (!value) return null;
    return (
      <View className="flex-row items-start py-3 border-b border-gray-50">
        <MaterialCommunityIcons name={icon as any} size={20} color="#F05C0C" />
        <View className="ml-3 flex-1">
          <Text className="text-xs text-gray-500 mb-1">{label}</Text>
          <Text className="text-gray-900">{value}</Text>
        </View>
      </View>
    );
  };

  if (readOnly) {
    const email = profile?.practice_email || profile?.email;
    const phone = profile?.practice_phone;
    const officePhone = profile?.contact_cell_phone;
    const fax = profile?.fax_number;
    const website = profile?.practice_website;
    const otherLocations = profile?.other_locations || [];

    const hasAnyContact = email || phone || officePhone || fax || website || otherLocations.length > 0;

    const renderSection = (
      title: string,
      subtitle: string,
      icon: string,
      children: React.ReactNode
    ) => (
      <View className="bg-white rounded-2xl p-5">
        <View className="pl-2 space-y-3">{children}</View>
      </View>
    );

    const renderItem = (
      label: string,
      value: string | undefined | null,
      iconName: string
    ) => {
      if (!value) return null;
      return (
        <View className="flex-row items-start mb-3">
          <View className="mt-1 w-6">
            <MaterialCommunityIcons
              name={iconName as any}
              size={16}
              color="#9CA3AF"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
              {label}
            </Text>
            <Text className="text-base text-gray-800 font-medium">{value}</Text>
          </View>
        </View>
      );
    };

    const openMap = (address: DoctorLocation) => {
      const fullAddress = `${address.address_line_1}, ${address.city}, ${address.state} ${address.zip_code}`;
      const url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(fullAddress)}`,
        android: `geo:0,0?q=${encodeURIComponent(fullAddress)}`,
      });

      if (url) {
        Linking.openURL(url).catch(err => {
          logger.error('Failed to open map', err as Error, {
            component: 'ProfessionalContactForm',
            address: fullAddress,
          });
          Alert.alert('Error', 'Could not open map application.');
        });
      }
    };

    return (
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
        >
          {hasAnyContact ? (
            <>
              {(email || phone) &&
                renderSection(
                  'Email & Phone',
                  '',
                  'email-outline',
                  <>
                    {renderItem('Email', email, 'email-outline')}
                    {renderItem('Phone', phone, 'phone-outline')}
                    {renderItem('Office Phone', officePhone, 'phone-classic')}
                    {renderItem('Fax Number', fax, 'fax')}
                    {renderItem('Website URL', website, 'link')}
                  </>
                )}
              {/* 
              {(officePhone || fax) &&
                renderSection(
                  'Office & Fax',
                  'Facility contact details',
                  'office-building',
                  <>

                  </>
                )}

              {website &&
                renderSection(
                  'Digital Presence',
                  'Website and online resources',
                  'web',
                  <>

                  </>
                )} */}

              {otherLocations.length > 0 && (
                <View className="bg-white rounded-2xl p-5 mb-4">
                  {otherLocations.map((address: DoctorLocation, index: number) => (
                    <View key={index} className="mb-4">
                      <TouchableOpacity
                        className="flex-row items-center mb-2"
                        onPress={() => openMap(address)}
                      >
                        <View className="w-8 h-8 rounded-full items-center justify-center mr-2">
                          <MaterialCommunityIcons
                            name={address.is_primary ? 'star-outline' : 'map-marker-radius-outline'}
                            size={18}
                            color="#9CA3AF"
                          />
                        </View>
                        <View className="flex-1 flex-row items-center">
                          <Text className="text-base font-bold text-gray-900 shrink-1 mr-2">
                            {address.location_name || `Location ${index + 1}`}
                          </Text>
                          <MaterialCommunityIcons
                            name="open-in-new"
                            size={16}
                            color="#F05C0C"
                          />
                        </View>
                        {address.is_primary && (
                          <View className="bg-orange-50 px-2 py-0.5 rounded border border-orange-100 ml-2">
                            <Text className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                              Primary
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <View className="ml-10">
                        <Text className="text-lg text-gray-600 leading-5">
                          {address.address_line_1}
                        </Text>
                        {address.address_line_2 ? (
                          <Text className="text-lg text-gray-600 leading-5">
                            {address.address_line_2}
                          </Text>
                        ) : null}
                        <Text className="text-lg text-gray-600 leading-5">
                          {address.city}, {address.state} {address.zip_code}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View className="items-center justify-center py-20">
              <View className="w-20 h-20 rounded-full items-center justify-center mb-6">
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={40}
                  color="#9CA3AF"
                />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                No Contact Info
              </Text>
              <Text className="text-gray-500 text-center max-w-[250px]">
                This doctor hasn't added any professional contact details yet.
              </Text>
            </View>
          )}
          <View className="h-10" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 py-6">
          {/* Header Section */}

          {/* Primary Contact Section */}
          <View className="mb-3">
            <View className="bg-white rounded-xl border-b border-gray-100 p-6">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={22}
                    color="white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    Email & Phone
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Your main contact methods
                  </Text>
                </View>
              </View>

              <View>
                <View className="mb-4">
                  <Controller
                    control={control}
                    name="professionalEmail"
                    rules={validationRules.professionalEmail}
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <FormFieldWrapper
                        type="text"
                        field="professional_email"
                        label="Professional Email"
                        placeholder="doctor@yourpractice.com"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        isActive={selectedInput === 'professional_email'}
                        borderColor={
                          error
                            ? '#EF4444'
                            : getBorderColor('professional_email')
                        }
                        labelStyle={getLabelStyle('professional_email')}
                        onFocus={() => handleFocus('professional_email')}
                        onBlur={() => {
                          onBlur();
                          handleBlur('professional_email');
                        }}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </View>

                <View className="mb-4">
                  <Controller
                    control={control}
                    name="professionalPhone"
                    rules={validationRules.professionalPhone}
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <FormFieldWrapper
                        type="text"
                        field="professional_phone"
                        label="Professional Phone"
                        placeholder="(555) 123-4567"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="phone-pad"
                        isActive={selectedInput === 'professional_phone'}
                        borderColor={
                          error
                            ? '#EF4444'
                            : getBorderColor('professional_phone')
                        }
                        labelStyle={getLabelStyle('professional_phone')}
                        onFocus={() => handleFocus('professional_phone')}
                        onBlur={() => {
                          onBlur();
                          handleBlur('professional_phone');
                        }}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Office Contact Section */}
          <View className="mb-3">
            <View className="bg-white rounded-xl border-b border-gray-100 p-6">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="office-building"
                    size={22}
                    color="white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    Office & Fax
                  </Text>
                </View>
              </View>

              <View>
                <View className="mb-4">
                  <Controller
                    control={control}
                    name="officePhone"
                    rules={validationRules.officePhone}
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <FormFieldWrapper
                        type="text"
                        field="office_phone"
                        label="Office Phone"
                        placeholder="(555) 987-6543"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="phone-pad"
                        isActive={selectedInput === 'office_phone'}
                        borderColor={
                          error ? '#EF4444' : getBorderColor('office_phone')
                        }
                        labelStyle={getLabelStyle('office_phone')}
                        onFocus={() => handleFocus('office_phone')}
                        onBlur={() => {
                          onBlur();
                          handleBlur('office_phone');
                        }}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </View>

                <View className="mb-4">
                  <Controller
                    control={control}
                    name="faxNumber"
                    rules={validationRules.faxNumber}
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <FormFieldWrapper
                        type="text"
                        field="fax_number"
                        label="Fax Number (Optional)"
                        placeholder="(555) 111-2222"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="phone-pad"
                        isActive={selectedInput === 'fax_number'}
                        borderColor={
                          error ? '#EF4444' : getBorderColor('fax_number')
                        }
                        labelStyle={getLabelStyle('fax_number')}
                        onFocus={() => handleFocus('fax_number')}
                        onBlur={() => {
                          onBlur();
                          handleBlur('fax_number');
                        }}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Online Presence Section */}
          <View className="mb-6">
            <View className="bg-white rounded-xl border-b border-gray-100 p-6">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
                  <MaterialCommunityIcons name="web" size={22} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    Website & Digital
                  </Text>
                </View>
              </View>

              <Controller
                control={control}
                name="websiteUrl"
                rules={validationRules.websiteUrl}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <FormFieldWrapper
                    type="text"
                    field="website_url"
                    label="Website URL (Optional)"
                    placeholder="https://www.yourpractice.com"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    isActive={selectedInput === 'website_url'}
                    borderColor={
                      error ? '#EF4444' : getBorderColor('website_url')
                    }
                    labelStyle={getLabelStyle('website_url')}
                    onFocus={() => handleFocus('website_url')}
                    onBlur={() => {
                      onBlur();
                      handleBlur('website_url');
                    }}
                    errorMessage={error?.message}
                  />
                )}
              />
            </View>
          </View>

          {/* Bottom Spacing */}
          <View className="h-32" />
        </View>
      </ScrollView>
      {!readOnly && (isDirty || isUpdatingContactInfo) && (
        <Animated.View
          entering={FadeInUp.duration(300)}
          exiting={FadeOutDown.duration(200)}
          className="absolute bottom-4 left-4 right-4 mb-4 pb-4"
        >
          <StandardBottomButton
            onPress={handleSave}
            label="Save Contact Information"
            isLoading={isUpdatingContactInfo}
            isDisabled={isUpdatingContactInfo}
          />
        </Animated.View>
      )}
    </View>
  );
};
