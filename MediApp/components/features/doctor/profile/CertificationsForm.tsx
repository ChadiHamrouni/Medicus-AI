import {
  FormFieldWrapper,
  StandardBottomButton,
  ThreeDotsLoader,
} from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDoctorProfile } from '@/hooks/doctor';
import { useDoctorPublicProfile } from '@/hooks/doctor/useDoctorPublicProfile';
import { Certification, ProfessionalInfoRequest, DoctorProfileResponse } from '@/types';
import { logger } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

type CertificationsFormData = {
  certifications: Certification[];
};

const certificationValidationRules = {
  title: {
    required: 'Certification title is required',
    minLength: {
      value: 2,
      message: 'Title must be at least 2 characters',
    },
  },
  issuing_body: {
    required: 'Issuing body is required',
    minLength: {
      value: 2,
      message: 'Issuing body must be at least 2 characters',
    },
  },
  certif_date: {
    required: 'Certification date is required',
    pattern: {
      value: /^\d{4}-\d{2}-\d{2}$/,
      message: 'Please use YYYY-MM-DD format',
    },
  },
};

interface CertificationsFormProps {
  embedMode?: boolean;
  readOnly?: boolean;
  doctorId?: number; // For viewing another doctor's profile
}

export const CertificationsForm: React.FC<CertificationsFormProps> = ({
  embedMode = false,
  readOnly = false,
  doctorId,
}) => {
  const {
    profile: ownProfile,
    updateProfessionalInfo,
    isUpdatingProfessionalInfo,
    isLoading: isLoadingOwn,
    refetch,
  } = useDoctorProfile();

  // Determine which profile to use
  const isViewingOtherDoctor = readOnly && !!doctorId;
  const {
    data: viewedDoctorProfile,
    isLoading: isLoadingViewed
  } = useDoctorPublicProfile(isViewingOtherDoctor ? doctorId : undefined);

  const profile = isViewingOtherDoctor ? viewedDoctorProfile || null : ownProfile;
  const isLoading = isViewingOtherDoctor ? isLoadingViewed : isLoadingOwn;

  // Fetch detailed profile data on mount if certifications is missing
  // (LIGHT data from login doesn't include certifications, need DETAILED data)
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current && profile && !profile.certifications) {
      hasFetchedRef.current = true;
      logger.info('Fetching detailed profile for certifications', {
        component: 'CertificationsForm',
      });
      refetch(false, 300000); // 5 minutes stale time
    }
  }, [profile, refetch]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<CertificationsFormData>({
    defaultValues: {
      certifications: [{ title: '', issuing_body: '', certif_date: '' }],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'certifications',
  });

  const formFields = ['title', 'issuing_body', 'certif_date'];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  useEffect(() => {
    if (profile) {
      const formData: CertificationsFormData = {
        certifications:
          profile.certifications && profile.certifications.length > 0
            ? profile.certifications
            : [{ title: '', issuing_body: '', certif_date: '' }],
      };

      reset(formData);
      logger.info('CertificationsForm populated with profile data', {
        component: 'CertificationsForm',
        certificationsCount: formData.certifications.length,
      });
    }
  }, [profile, reset]);

  const addCertification = () => {
    const lastCertification = fields[fields.length - 1];
    const lastCertValue = lastCertification
      ? {
        title: watch(`certifications.${fields.length - 1}.title`),
        issuing_body: watch(
          `certifications.${fields.length - 1}.issuing_body`
        ),
        certif_date: watch(`certifications.${fields.length - 1}.certif_date`),
      }
      : null;

    if (
      lastCertValue &&
      (!lastCertValue.title.trim() ||
        !lastCertValue.issuing_body.trim() ||
        !lastCertValue.certif_date.trim())
    ) {
      Alert.alert(
        'Incomplete Certification',
        'Please fill in all fields of the current certification before adding a new one.'
      );
      return;
    }

    append({ title: '', issuing_body: '', certif_date: '' });
  };

  const removeCertification = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleDateChange = (
    text: string,
    onChange: (value: string) => void
  ) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    // Add hyphens: YYYY-MM-DD
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    if (cleaned.length > 6) {
      formatted = `${formatted.slice(0, 7)}-${cleaned.slice(6)}`;
    }

    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }

    onChange(formatted);
  };



  const onSubmit = useCallback(
    async (data: CertificationsFormData) => {
      try {
        const validCertifications = data.certifications.filter(
          cert =>
            cert.title.trim() &&
            cert.issuing_body.trim() &&
            cert.certif_date.trim()
        );

        const request: ProfessionalInfoRequest = {
          certifications: validCertifications.map(cert => ({
            title: cert.title.trim(),
            issuing_body: cert.issuing_body.trim(),
            certif_date: cert.certif_date.trim(),
          })),
        };

        await updateProfessionalInfo(request);

        Alert.alert('Success', 'Certifications updated successfully!');

        reset(data);
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to save certifications. Please try again.'
        );
        logger.error('Update error:', error as Error, {
          component: 'CertificationsForm',
        });
      }
    },
    [updateProfessionalInfo, reset]
  );

  if (isLoading && !profile) {
    return (
      <View className="flex-1 items-center justify-center py-20 px-4">
        <ThreeDotsLoader size={24} />
      </View>
    );
  }

  // Read-only view - plain text display
  if (readOnly) {
    const certifications = profile?.certifications || [];

    return (
      <View className={`${embedMode ? '' : 'flex-1'} bg-white`}>
        <View className="p-4">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons name="certificate" size={20} color="#F05C0C" />
            <Text className="ml-2 text-base font-semibold text-gray-900">
              Certifications
            </Text>
          </View>

          {certifications.length > 0 ? (
            <View className="space-y-4">
              {certifications.map((cert, index) => (
                <View
                  key={index}
                  className="bg-white rounded-2xl p-5 mb-2"
                >
                  <View className="flex-row items-start">
                    {/* <View className="w-10 h-10 rounded-full items-center justify-center mr-3 mt-0.5">
                      <MaterialCommunityIcons
                        name="certificate"
                        size={20}
                        color="#F05C0C"
                      />
                    </View> */}
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-gray-900 mb-1">
                        {cert.title}
                      </Text>
                      <View className="flex-row items-center mb-2">
                        {/* <MaterialCommunityIcons
                          name="bank-outline"
                          size={14}
                          color="#6B7280"
                        /> */}
                        <Text className="text-gray-600 text-md font-medium">
                          {cert.issuing_body}
                        </Text>
                      </View>
                      {cert.certif_date && (
                        <View className="flex-row items-center self-start rounded-lg">
                          {/* <MaterialCommunityIcons
                            name="calendar-month-outline"
                            size={12}
                            color="#4B5563"
                          /> */}
                          <Text className="text-gray-600 text-md font-semibold uppercase tracking-wide">
                            Issued: {cert.certif_date}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <MaterialCommunityIcons name="certificate-outline" size={32} color="#9CA3AF" />
              <Text className="text-gray-400 mt-2 font-medium">No certifications listed</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className={`${embedMode ? '' : 'flex-1'} bg-white`}>
      {embedMode ? (
        <View className="bg-white">
          <View className="p-4">
            <View className="mb-6">
              {fields.map((field, index) => (
                <View
                  key={field.id}
                  className="mb-4 p-6 border-b border-gray-200 rounded-lg bg-white relative"
                >
                  {fields.length > 1 && !readOnly && (
                    <TouchableOpacity
                      onPress={() => removeCertification(index)}
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

                  {/* Header with Icon */}
                  {/* <View className="flex-row items-center mb-4 pb-3 ">
                  <MaterialCommunityIcons
                    name="certificate"
                    size={24}
                    color="#F05C0C"
                    />
                  <Text className="ml-2 text-lg font-semibold text-gray-800">
                    Certification {index + 1}
                  </Text>
                </View> */}

                  <View className="mb-4">
                    <Controller
                      control={control}
                      name={`certifications.${index}.title`}
                      rules={certificationValidationRules.title}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`title_${index}`}
                          value={value}
                          label="Certification Title"
                          placeholder="Board Certified Internal Medicine"
                          isActive={selectedInput === `title_${index}`}
                          borderColor={
                            error ? '#EF4444' : getBorderColor(`title_${index}`)
                          }
                          labelStyle={getLabelStyle(`title_${index}`)}
                          onFocus={() => handleFocus(`title_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`title_${index}`);
                          }}
                          onChangeText={onChange}
                          errorMessage={error?.message}
                        />
                      )}
                    />
                  </View>
                  <View className="mb-4">
                    <Controller
                      control={control}
                      name={`certifications.${index}.issuing_body`}
                      rules={certificationValidationRules.issuing_body}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`issuing_body_${index}`}
                          value={value}
                          label="Issuing Body"
                          placeholder="American Board of Internal Medicine"
                          isActive={selectedInput === `issuing_body_${index}`}
                          borderColor={
                            error
                              ? '#EF4444'
                              : getBorderColor(`issuing_body_${index}`)
                          }
                          labelStyle={getLabelStyle(`issuing_body_${index}`)}
                          onFocus={() => handleFocus(`issuing_body_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`issuing_body_${index}`);
                          }}
                          onChangeText={onChange}
                          errorMessage={error?.message}
                        />
                      )}
                    />
                  </View>
                  <View>
                    <Controller
                      control={control}
                      name={`certifications.${index}.certif_date`}
                      rules={certificationValidationRules.certif_date}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`certif_date_${index}`}
                          value={value}
                          label="Certification Date"
                          placeholder="YYYY-MM-DD"
                          isActive={selectedInput === `certif_date_${index}`}
                          borderColor={
                            error
                              ? '#EF4444'
                              : getBorderColor(`certif_date_${index}`)
                          }
                          labelStyle={getLabelStyle(`certif_date_${index}`)}
                          onFocus={() => handleFocus(`certif_date_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`certif_date_${index}`);
                          }}
                          onChangeText={text => handleDateChange(text, onChange)}
                          errorMessage={error?.message}
                        />
                      )}
                    />
                  </View>
                </View>
              ))}
              {!readOnly && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={addCertification}
                  className="flex-row items-center justify-center p-4 border border-gray-200 rounded-lg bg-white"
                >
                  <MaterialCommunityIcons name="plus" size={24} color="gray" />
                  <Text className="ml-2 text-gray-700">Add Certification</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom Spacing - Only if not embedded */}
            {!embedMode && <View className="h-32" />}
          </View>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
          <View className="p-4">
            <View className="mb-6">
              {fields.map((field, index) => (
                <View
                  key={field.id}
                  className="mb-4 p-6 border-b border-gray-200 rounded-lg bg-white relative"
                >
                  {fields.length > 1 && !readOnly && (
                    <TouchableOpacity
                      onPress={() => removeCertification(index)}
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

                  <View className="mb-4">
                    <Controller
                      control={control}
                      name={`certifications.${index}.title`}
                      rules={certificationValidationRules.title}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`title_${index}`}
                          value={value}
                          label="Certification Title"
                          placeholder="Board Certified Internal Medicine"
                          isActive={selectedInput === `title_${index}`}
                          borderColor={
                            error ? '#EF4444' : getBorderColor(`title_${index}`)
                          }
                          labelStyle={getLabelStyle(`title_${index}`)}
                          onFocus={() => handleFocus(`title_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`title_${index}`);
                          }}
                          onChangeText={onChange}
                          errorMessage={error?.message}
                        />
                      )}
                    />
                  </View>
                  <View className="mb-4">
                    <Controller
                      control={control}
                      name={`certifications.${index}.issuing_body`}
                      rules={certificationValidationRules.issuing_body}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`issuing_body_${index}`}
                          value={value}
                          label="Issuing Body"
                          placeholder="American Board of Internal Medicine"
                          isActive={selectedInput === `issuing_body_${index}`}
                          borderColor={
                            error
                              ? '#EF4444'
                              : getBorderColor(`issuing_body_${index}`)
                          }
                          labelStyle={getLabelStyle(`issuing_body_${index}`)}
                          onFocus={() => handleFocus(`issuing_body_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`issuing_body_${index}`);
                          }}
                          onChangeText={onChange}
                          errorMessage={error?.message}
                        />
                      )}
                    />
                  </View>
                  <View>
                    <Controller
                      control={control}
                      name={`certifications.${index}.certif_date`}
                      rules={certificationValidationRules.certif_date}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`certif_date_${index}`}
                          value={value}
                          label="Certification Date"
                          placeholder="2020-06-15"
                          isActive={selectedInput === `certif_date_${index}`}
                          borderColor={
                            error
                              ? '#EF4444'
                              : getBorderColor(`certif_date_${index}`)
                          }
                          labelStyle={getLabelStyle(`certif_date_${index}`)}
                          onFocus={() => handleFocus(`certif_date_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`certif_date_${index}`);
                          }}
                          onChangeText={text => handleDateChange(text, onChange)}
                          errorMessage={error?.message}
                        />
                      )}
                    />
                  </View>
                </View>
              ))}
              {!readOnly && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={addCertification}
                  className="flex-row items-center justify-center p-4 border border-gray-200 rounded-lg bg-white"
                >
                  <MaterialCommunityIcons name="plus" size={24} color="gray" />
                  <Text className="ml-2 text-gray-700">Add Certification</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom Spacing */}
            <View className="h-32" />
          </View>
        </ScrollView>
      )}
      {!readOnly && (isDirty || isUpdatingProfessionalInfo) &&
        (embedMode ? (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutDown.duration(200)}
            className="p-4 pb-10 border-t border-gray-100 mt-4"
          >
            <StandardBottomButton
              onPress={handleSubmit(onSubmit)}
              label="Save Certifications"
              isLoading={isUpdatingProfessionalInfo}
              isDisabled={isUpdatingProfessionalInfo}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutDown.duration(200)}
            className="absolute bottom-4 left-4 right-4 mb-4"
          >
            <StandardBottomButton
              onPress={handleSubmit(onSubmit)}
              label="Save Certifications"
              isLoading={isUpdatingProfessionalInfo}
              isDisabled={isUpdatingProfessionalInfo}
            />
          </Animated.View>
        ))}
    </View>
  );
};
