import {
  FormFieldWrapper,
  OptionSelector,
  StandardBottomButton,
  ThreeDotsLoader,
} from '@/components/shared/ui';
import { CONSULTATION_TYPES, CURRENCIES, INSURANCE_PLANS, GENDERS } from '@/constants';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDoctorProfile, useDoctorPublicProfile } from '@/hooks/doctor';
import { useAuthContext } from '@/contexts/AuthContext';
import { MedicalProceduresRequest, DoctorProfileResponse } from '@/types';
import { logger } from '@/utils';
import { getDoctorPublicProfile } from '@/services/doctor/profile';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

// Use GENDERS directly since it already has { key, value } format

const LANGUAGE_OPTIONS = [
  { key: '1', value: 'English' },
  { key: '2', value: 'French' },
  { key: '3', value: 'Arabic' },
  { key: '4', value: 'Spanish' },
];

interface ProcedureFormData {
  procedure_name: string;
  procedure_price: string;
}

interface ProceduresAndFeesFormData {
  currency: string;
  procedures: ProcedureFormData[];
  consultation_types: string[];
  insurance_accepted: string[];
  gender: string;
  language_id: string;
  established_since: string;
}

const procedureValidationRules = {
  currency: {
    required: 'Currency is required',
  },
  procedure_name: {
    required: 'Procedure name is required',
    minLength: {
      value: 2,
      message: 'Procedure name must be at least 2 characters',
    },
  },
  procedure_price: {
    required: 'Price is required',
    pattern: {
      value: /^\d+(\.\d{1,2})?$/,
      message: 'Please enter a valid price (e.g., 100 or 100.50)',
    },
  },
};

interface ProceduresAndFeesFormProps {
  fromProfile?: boolean;
  readOnly?: boolean;
  doctorId?: number; // For viewing another doctor's profile
}

export const ProceduresAndFeesForm: React.FC<ProceduresAndFeesFormProps> =
  React.memo(({ fromProfile: _fromProfile = true, readOnly = false, doctorId }) => {
    const { updateProcedures, isUpdatingProcedures, profile: ownProfile, isLoading: isLoadingOwn, refetch, error: ownError } =
      useDoctorProfile();

    // State for viewing another doctor's profile
    const isViewingOtherDoctor = readOnly && !!doctorId;
    const {
      data: viewedDoctorProfile,
      isLoading: isLoadingViewed,
      error: viewedError
    } = useDoctorPublicProfile(isViewingOtherDoctor ? doctorId : undefined);

    // Determine which profile to use
    // const isViewingOtherDoctor = readOnly && doctorId;
    const profile = isViewingOtherDoctor ? viewedDoctorProfile || null : ownProfile;
    const isLoading = isViewingOtherDoctor ? isLoadingViewed : isLoadingOwn;
    const error = isViewingOtherDoctor ? (viewedError ? (viewedError as Error).message : null) : ownError;



    // Fetch detailed profile data on mount if medical_procedures is missing
    // (LIGHT data from login doesn't include procedures, need DETAILED data)
    const hasFetchedRef = useRef(false);
    useEffect(() => {
      if (!hasFetchedRef.current && profile && !profile.medical_procedures) {
        hasFetchedRef.current = true;
        logger.info('Fetching detailed profile for medical procedures', {
          component: 'ProceduresAndFeesForm',
        });
        refetch(false, 300000); // 5 minutes stale time
      }
    }, [profile, refetch]);

    const [selectedDropdown, setSelectedDropdown] = useState<string | null>(
      null
    );

    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = useCallback(async () => {
      setIsRetrying(true);
      await refetch(true);
      setIsRetrying(false);
    }, [refetch]);

    const { authState } = useAuthContext();

    const getDefaultFormData = (): ProceduresAndFeesFormData => ({
      currency: CURRENCIES[0].value || '',
      procedures: [{ procedure_name: '', procedure_price: '' }],
      consultation_types: [],
      insurance_accepted: [],
      gender: '',
      language_id: '1',
      established_since: '',
    });

    const {
      control,
      handleSubmit,
      reset,
      formState: { isDirty },
      setValue,
      getValues,
    } = useForm<ProceduresAndFeesFormData>({
      defaultValues: getDefaultFormData(),
    });

    const { fields, append, remove } = useFieldArray({
      control,
      name: 'procedures',
    });

    useEffect(() => {
      if (profile) {
        const formData: ProceduresAndFeesFormData = {
          currency:
            profile.medical_procedures?.currency ||
            profile.currency ||
            CURRENCIES[0].value ||
            '',
          procedures:
            profile.medical_procedures?.medical_procedures &&
              profile.medical_procedures.medical_procedures.length > 0
              ? profile.medical_procedures.medical_procedures.map(proc => ({
                procedure_name: proc.procedure_name,
                procedure_price: proc.procedure_price?.toString() || '',
              }))
              : [{ procedure_name: '', procedure_price: '' }],
          consultation_types:
            profile.medical_procedures?.consultation_types ||
            profile.consultation_types ||
            [],
          insurance_accepted:
            profile.medical_procedures?.insurance_accepted ||
            profile.insurance_accepted ||
            [],
          gender: (() => {
            const rawGender = authState.user?.gender || profile.gender || '';
            if (!rawGender) return '';

            const v = rawGender.trim().toUpperCase();
            if (v === 'MALE' || v === 'M') return 'male';
            if (v === 'FEMALE' || v === 'F') return 'female';
            if (v === 'UNDISCLOSED' || v === 'PREFER NOT TO SAY')
              return 'prefer_not_to_say';

            const normalized = GENDERS.find(
              g =>
                g.key.toUpperCase() === v ||
                g.value.toUpperCase() === v
            );
            return normalized ? normalized.key : rawGender;
          })(),
          language_id: profile.language_id?.toString() || '1',
          established_since: profile.established_since || '',
        };

        reset(formData);
        logger.info('ProceduresAndFeesForm populated with profile data', {
          component: 'ProceduresAndFeesForm',
          proceduresCount: formData.procedures.length,
        });
      }
    }, [profile, reset, authState.user]);

    const onSubmit = useCallback(
      async (data: ProceduresAndFeesFormData) => {
        try {
          const validProcedures = data.procedures.filter(
            procedure =>
              procedure.procedure_name.trim() &&
              procedure.procedure_price.trim()
          );

          const proceduresData: MedicalProceduresRequest = {
            currency: data.currency,
            medical_procedures: validProcedures.map(procedure => ({
              procedure_name: procedure.procedure_name.trim(),
              procedure_price: procedure.procedure_price.trim(),
            })),
            consultation_types: data.consultation_types,
            insurance_accepted: data.insurance_accepted,
            gender: data.gender || undefined,
            language_id: data.language_id ? parseInt(data.language_id) : undefined,
            established_since: data.established_since || undefined,
          };

          await updateProcedures(proceduresData);

          Alert.alert('Success', 'Practice settings updated successfully!');

          reset(data);
        } catch (error: any) {
          const errorMessage =
            error?.message || 'Failed to update practice settings. Please try again.';
          Alert.alert('Error', errorMessage);
          logger.error('Update error:', error as Error, {
            component: 'ProceduresAndFeesForm',
          });
        }
      },
      [updateProcedures, reset]
    );

    const formFields = [
      'currency',
      'procedureName',
      'procedurePrice',
      'consultationTypes',
      'insurancePlans',
    ];
    const {
      selectedInput,
      getBorderColor,
      getLabelStyle,
      handleFocus,
      handleBlur,
    } = useAnimatedFormField(formFields, 'white');

    const addProcedure = () => {
      const lastProcedure = fields[fields.length - 1];
      const lastProcedureValue = lastProcedure
        ? {
          procedure_name: getValues(
            `procedures.${fields.length - 1}.procedure_name`
          ),
          procedure_price: getValues(
            `procedures.${fields.length - 1}.procedure_price`
          ),
        }
        : null;

      if (
        lastProcedureValue &&
        (!lastProcedureValue.procedure_name.trim() ||
          !lastProcedureValue.procedure_price.trim())
      ) {
        Alert.alert(
          'Incomplete Procedure',
          'Please fill in both procedure name and price before adding a new one.'
        );
        return;
      }

      append({ procedure_name: '', procedure_price: '' });
    };

    const removeProcedure = (index: number) => {
      if (fields.length > 1) {
        remove(index);
      }
    };

    const toggleConsultationType = useCallback(
      (type: string) => {
        const currentTypes = getValues('consultation_types');
        const newTypes = currentTypes.includes(type)
          ? currentTypes.filter(t => t !== type)
          : [...currentTypes, type];
        setValue('consultation_types', newTypes, {
          shouldDirty: true,
          shouldValidate: true,
        });
      },
      [getValues, setValue]
    );

    const toggleInsurancePlan = useCallback(
      (plan: string) => {
        const currentPlans = getValues('insurance_accepted');
        const newPlans = currentPlans.includes(plan)
          ? currentPlans.filter(p => p !== plan)
          : [...currentPlans, plan];
        setValue('insurance_accepted', newPlans, {
          shouldDirty: true,
          shouldValidate: true,
        });
      },
      [getValues, setValue]
    );

    const clearSelection = useCallback(() => {
      // Clear any existing selections if needed
    }, []);

    if ((isLoading && !profile && !isUpdatingProcedures) || isRetrying) {
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
            An error occurred while fetching your medical procedures.
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
      const selectedInsurance = profile?.medical_procedures?.insurance_accepted || profile?.insurance_accepted || [];
      const selectedConsultation = profile?.medical_procedures?.consultation_types || profile?.consultation_types || [];
      const procedures = profile?.medical_procedures?.medical_procedures || [];

      const genderValue = authState.user?.gender || profile?.gender || '';
      const selectedGender = GENDERS.find(g => g.key.toLowerCase() === genderValue.toLowerCase() || g.value.toLowerCase() === genderValue.toLowerCase());

      const languageId = profile?.language_id?.toString() || '1';
      const selectedLanguage = LANGUAGE_OPTIONS.find(l => l.key === languageId);

      const currencyValue = profile?.medical_procedures?.currency || profile?.currency || CURRENCIES[0].value;
      // Match by key first (e.g. "USD"), then by value
      const selectedCurrency = CURRENCIES.find(c => c.key === currencyValue || c.value === currencyValue);

      // Established since
      const establishedSince = profile?.established_since || '';

      const formatValue = (val: string) => {
        return val.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };

      const renderSectionHeader = (
        icon: string,
        title: string,
        subtitle?: string
      ) => (
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 rounded-full items-center justify-center mr-3">
            <MaterialCommunityIcons
              name={icon as any}
              size={20}
              color="#F05C0C"
            />
          </View>
          <View>
            <Text className="text-xl font-bold text-gray-900">{title}</Text>
            {subtitle && (
              <Text className="text-sm text-gray-500 font-medium">
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      );

      return (
        <View className="flex-1 bg-white">
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
          >
            <View className="space-y-4">
              {/* Doctor General Info Card */}
              <View className="bg-white rounded-2xl p-5">
                {/* {renderSectionHeader('account-details', 'General Information')} */}

                <View className="space-y-4 pl-2">
                  <View>
                    {/* <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Doctor Name
                    </Text> */}
                    <Text className="text-xl text-gray-900 font-bold">
                      Dr. {profile?.first_name} {profile?.last_name}
                    </Text>
                    {profile?.specialty_name && (
                      <Text className="text-base text-[#F05C0C] font-medium mt-0.5">
                        {profile.specialty_name}
                      </Text>
                    )}
                  </View>

                  <View className="flex-row flex-wrap mt-2">
                    {establishedSince && (
                      <View className="w-1/2 mb-4 pr-2">
                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Established
                        </Text>
                        <Text className="text-base text-gray-900">
                          Since {establishedSince}
                        </Text>
                      </View>
                    )}
                    {/* {selectedGender && (
                      <View className="w-1/2 mb-4 pl-2 mt-2">
                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Gender
                        </Text>
                        <Text className="text-base text-gray-900">
                          {selectedGender.value}
                        </Text>
                      </View>
                    )} */}
                    {/* {selectedLanguage && (
                      <View className="w-1/2 pr-2 mt-2">
                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Language
                        </Text>
                        <Text className="text-base text-gray-900">
                          {selectedLanguage.value}
                        </Text>
                      </View>
                    )} */}
                  </View>
                </View>
              </View>

              {/* Consultation Types */}
              {selectedConsultation.length > 0 && (
                <View className="bg-white rounded-2xl p-5">
                  {renderSectionHeader('stethoscope', 'Consultation Types')}
                  <View className="flex-row flex-wrap pl-2">
                    {selectedConsultation.map(key => (
                      <View
                        key={key}
                        className="px-3 py-1.5 rounded-lg mr-2 mb-2 border border-orange-100"
                      >
                        <Text className="font-medium text-md">
                          {CONSULTATION_TYPES.find(t => t.key === key)?.value || formatValue(key)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Insurance Plans */}
              {selectedInsurance.length > 0 && (
                <View className="bg-white rounded-2xl p-5">
                  {renderSectionHeader('shield-check', 'Insurance Accepted')}
                  <View className="flex-row flex-wrap pl-2">
                    {selectedInsurance.map(key => (
                      <View
                        key={key}
                        className="border border-gray-100 px-3 py-1.5 rounded-lg mr-2 mb-2"
                      >
                        <Text className="font-medium text-md">
                          {INSURANCE_PLANS.find(p => p.key === key)?.value || formatValue(key)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Procedures & Prices */}
              <View className="bg-white rounded-2xl p-5">
                {renderSectionHeader(
                  'medical-bag',
                  'Procedures & Fees',
                  selectedCurrency
                    ? `Currency: ${selectedCurrency.value}`
                    : undefined
                )}

                {procedures.length > 0 ? (
                  <View className="space-y-3 pl-2">
                    {procedures.map((proc, idx) => (
                      <View
                        key={idx}
                        className="flex-row justify-between items-center py-2 border-b border-gray-50 last:border-0"
                      >
                        <Text className="text-gray-700 text-base flex-1 mr-4">
                          {proc.procedure_name}
                        </Text>
                        <Text className="text-gray-900 font-bold text-base">
                          {/* {selectedCurrency?.value || ''}{' '} */}
                          {proc.procedure_price}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="items-center justify-center py-6">
                    <Text className="text-gray-400 italic">
                      No specific procedures listed
                    </Text>
                  </View>
                )}
              </View>
            </View>
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
          <View className="p-4">
            {/* Doctor Info Header - Display Only */}
            <View className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white">
              <View className="items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">
                  Dr. {profile?.first_name} {profile?.last_name}
                </Text>
                {profile?.specialty_name && (
                  <Text className="text-base text-[#F05C0C] mt-1">{profile.specialty_name}</Text>
                )}
              </View>

              <View>
                {profile?.medical_licence && (
                  <View className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-500">License Number</Text>
                    <Text className="text-gray-900 font-medium">{profile.medical_licence}</Text>
                  </View>
                )}
                {profile?.country_name && (
                  <View className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-500">Licensed in</Text>
                    <Text className="text-gray-900 font-medium">{profile.country_name}</Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-500">Established since</Text>
                  <Controller
                    control={control}
                    name="established_since"
                    render={({ field: { onChange, value } }) => (
                      readOnly ? (
                        <Text className="text-gray-900 font-medium">{value || 'Not specified'}</Text>
                      ) : (
                        <TextInput
                          value={value}
                          onChangeText={onChange}
                          placeholder="YYYY-MM-DD"
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white"
                          placeholderTextColor="#9CA3AF"
                        />
                      )
                    )}
                  />
                </View>
              </View>
            </View>

            {/* Gender Card */}
            <View className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white">
              <View className="flex-row items-center mb-4 pb-3">
                <MaterialCommunityIcons name="account" size={24} color="#F05C0C" />
                <Text className="ml-2 text-lg font-semibold text-gray-800">Gender</Text>
              </View>
              <Controller
                control={control}
                name="gender"
                render={({ field: { value } }) => (
                  <OptionSelector
                    selectedOption={value}
                    onSelect={(val) => setValue('gender', val, { shouldDirty: true })}
                    options={GENDERS}
                    multiple={false}
                    readOnly={readOnly}
                  />
                )}
              />
            </View>

            {/* Practice Default Language Card */}
            <View className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white">
              <View className="flex-row items-center mb-4 pb-3">
                <MaterialCommunityIcons name="translate" size={24} color="#F05C0C" />
                <Text className="ml-2 text-lg font-semibold text-gray-800">Practice Default Language</Text>
              </View>
              <Controller
                control={control}
                name="language_id"
                render={({ field: { value } }) => (
                  <OptionSelector
                    selectedOption={value}
                    onSelect={(val) => setValue('language_id', val, { shouldDirty: true })}
                    options={LANGUAGE_OPTIONS}
                    multiple={false}
                    readOnly={readOnly}
                  />
                )}
              />
            </View>

            {/* Consultation Types Card */}
            <View className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white">
              <View className="flex-row items-center mb-4 pb-3 ">
                <MaterialCommunityIcons
                  name="stethoscope"
                  size={24}
                  color="#F05C0C"
                />
                <Text className="ml-2 text-lg font-semibold text-gray-800">
                  Consultation Types
                </Text>
              </View>
              <Controller
                control={control}
                name="consultation_types"
                render={({ field: { value } }) => (
                  <OptionSelector
                    selectedOption={value}
                    onSelect={toggleConsultationType}
                    options={CONSULTATION_TYPES}
                    multiple={true}
                    readOnly={readOnly}
                  />
                )}
              />
            </View>

            {/* Insurance Plans Card */}
            <View className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white">
              <View className="flex-row items-center mb-4 pb-3 ">
                <MaterialCommunityIcons
                  name="shield-check"
                  size={24}
                  color="#F05C0C"
                />
                <Text className="ml-2 text-lg font-semibold text-gray-800">
                  Insurance Plans Accepted
                </Text>
              </View>
              <Controller
                control={control}
                name="insurance_accepted"
                render={({ field: { value } }) => (
                  <OptionSelector
                    selectedOption={value}
                    onSelect={toggleInsurancePlan}
                    options={INSURANCE_PLANS}
                    multiple={true}
                    readOnly={readOnly}
                  />
                )}
              />
            </View>

            {/* Currency Card */}
            <View className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white">
              <View className="flex-row items-center mb-4 pb-3 ">
                <MaterialCommunityIcons name="cash" size={24} color="#F05C0C" />
                <Text className="ml-2 text-lg font-semibold text-gray-800">
                  Currency
                </Text>
              </View>
              <View>
                <Controller
                  control={control}
                  name="currency"
                  rules={procedureValidationRules.currency}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <FormFieldWrapper
                      type="singleDropdown"
                      field="currency"
                      value={value}
                      label="Select Currency"
                      isActive={selectedDropdown === 'currency'}
                      borderColor={
                        error ? '#EF4444' : getBorderColor('currency')
                      }
                      labelStyle={getLabelStyle('currency')}
                      onFocus={() => {
                        setSelectedDropdown('currency');
                        clearSelection();
                      }}
                      onBlur={() => {
                        setSelectedDropdown(null);
                      }}
                      options={CURRENCIES}
                      onValueChange={onChange}
                      errorMessage={error?.message}
                      backgroundColor="white"
                    />
                  )}
                />
              </View>
            </View>

            {/* Procedures Card */}
            <View className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white">
              <View className="flex-row items-center mb-4 pb-3 ">
                <MaterialCommunityIcons
                  name="medical-bag"
                  size={24}
                  color="#F05C0C"
                />
                <Text className="ml-2 text-lg font-semibold text-gray-800">
                  Procedures & Prices
                </Text>
              </View>

              {fields.map((field, index) => (
                <View
                  key={field.id}
                  className="mb-4 p-4 border-b border-gray-200 rounded-lg bg-white relative"
                >
                  {fields.length > 1 && !readOnly && (
                    <TouchableOpacity
                      onPress={() => removeProcedure(index)}
                      className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 p-1"
                      style={{ zIndex: 10 }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={14}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}

                  <View className="mb-4">
                    <Controller
                      control={control}
                      name={`procedures.${index}.procedure_name`}
                      rules={{
                        validate: value => {
                          const price = getValues(
                            `procedures.${index}.procedure_price`
                          );
                          if (
                            price &&
                            price.trim() &&
                            (!value || !value.trim())
                          ) {
                            return 'Procedure name is required when price is filled';
                          }
                          if (value && value.trim().length < 2) {
                            return 'Procedure name must be at least 2 characters';
                          }
                          return true;
                        },
                      }}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`procedureName_${index}`}
                          value={value}
                          label="Procedure Name"
                          isActive={selectedInput === `procedureName_${index}`}
                          borderColor={
                            error
                              ? '#EF4444'
                              : getBorderColor(`procedureName_${index}`)
                          }
                          labelStyle={getLabelStyle(`procedureName_${index}`)}
                          onFocus={() => handleFocus(`procedureName_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`procedureName_${index}`);
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
                      name={`procedures.${index}.procedure_price`}
                      rules={{
                        validate: value => {
                          const name = getValues(
                            `procedures.${index}.procedure_name`
                          );
                          if (
                            name &&
                            name.trim() &&
                            (!value || !value.trim())
                          ) {
                            return 'Price is required when procedure name is filled';
                          }
                          if (
                            value &&
                            value.trim() &&
                            !/^\d+(\.\d{1,2})?$/.test(value)
                          ) {
                            return 'Please enter a valid price (e.g., 100 or 100.50)';
                          }
                          return true;
                        },
                      }}
                      render={({
                        field: { onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <FormFieldWrapper
                          type="text"
                          field={`procedurePrice_${index}`}
                          value={value}
                          label="Price"
                          isActive={selectedInput === `procedurePrice_${index}`}
                          borderColor={
                            error
                              ? '#EF4444'
                              : getBorderColor(`procedurePrice_${index}`)
                          }
                          labelStyle={getLabelStyle(`procedurePrice_${index}`)}
                          onFocus={() => handleFocus(`procedurePrice_${index}`)}
                          onBlur={() => {
                            onBlur();
                            handleBlur(`procedurePrice_${index}`);
                          }}
                          onChangeText={onChange}
                          keyboardType="numeric"
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
                  onPress={addProcedure}
                  className="flex-row items-center justify-center p-4 border border-dashed border-gray-300 rounded-lg bg-white mt-2"
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#9CA3AF" />
                  <Text className="ml-2 text-gray-500 font-medium">
                    Add Procedure
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom Spacing */}
            <View className="h-32" />
          </View>
        </ScrollView>
        {!readOnly && (isDirty || isUpdatingProcedures) && (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutDown.duration(200)}
            className="absolute bottom-4 left-4 right-4 mb-4"
          >
            <StandardBottomButton
              onPress={handleSubmit(onSubmit)}
              label="Save Procedures"
              isLoading={isUpdatingProcedures}
              isDisabled={isUpdatingProcedures}
            />
          </Animated.View>
        )}
      </View>
    );
  });

ProceduresAndFeesForm.displayName = 'ProceduresAndFeesForm';
