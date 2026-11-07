import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useForm, FormProvider } from 'react-hook-form';
import { useContactData, useContactFormOperations } from '@/hooks';
import { PersonalInfoSection } from './PersonalInfoSection';
import { AddressSection } from './AddressSection';
import { LoadingSpinner } from '@/components/shared';
import {
  ContactFormData,
  defaultContactFormValues,
  validationRules,
} from '@/utils';

interface ContactDetailsFormProps {
  readOnly?: boolean;
}

export const ContactDetailsForm: React.FC<ContactDetailsFormProps> = ({
  readOnly,
}) => {
  const {
    contactData,
    isDependentContext,
    currentPatient,
    selectedDependent,
    isLoading: isLoadingData,
  } = useContactData();

  const { handleSavePersonal, handleSaveAddress, isSaving } =
    useContactFormOperations();

  const methods = useForm<ContactFormData>({
    defaultValues: defaultContactFormValues,
    mode: 'onChange',
  });

  const { reset, handleSubmit } = methods;

  const formData = useMemo(
    () => ({
      firstName: contactData.firstName || '',
      lastName: contactData.lastName || '',
      dateOfBirth: contactData.dateOfBirth || '',
      gender: contactData.gender || '',
      address: contactData.address || '',
      city: contactData.city || '',
      state: contactData.state || '',
      zipCode: contactData.zipCode || '',
      country: contactData.country_id ? contactData.country_id.toString() : '',
      country_name: contactData.country_name, // Denormalized country name
    }),
    [
      contactData.firstName,
      contactData.lastName,
      contactData.dateOfBirth,
      contactData.gender,
      contactData.address,
      contactData.city,
      contactData.state,
      contactData.zipCode,
      contactData.country_id,
      contactData.country_name,
    ]
  );

  useEffect(() => {
    reset(formData);
  }, [formData, reset]);

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const handlePersonalSave = async (data: ContactFormData) => {
    const personalData = {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
    };

    const success = await handleSavePersonal(
      { ...contactData, ...personalData },
      currentPatient,
      selectedDependent,
      isDependentContext
    );
    if (success) {
      setIsEditingPersonal(false);
    }
  };

  const handleAddressSave = async (data: ContactFormData) => {
    const addressData = {
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country_id: data.country ? parseInt(data.country, 10) : undefined,
    };

    const success = await handleSaveAddress(
      { ...contactData, ...addressData },
      currentPatient,
      selectedDependent,
      isDependentContext
    );
    if (success) {
      setIsEditingAddress(false);
    }
  };

  const isLoading = isSaving;

  // Show loading spinner while initially loading contact data
  if (isLoadingData) {
    return (
      <View className="flex-1 items-center justify-center py-24">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  const personalFieldNames = {
    firstName: 'firstName',
    lastName: 'lastName',
    dateOfBirth: 'dateOfBirth',
    gender: 'gender',
  };

  const addressFieldNames = {
    street: 'address',
    city: 'city',
    state: 'state',
    zipCode: 'zipCode',
    country: 'country',
  };

  return (
    <FormProvider {...methods}>
      <View className="flex-1 bg-white">
        <View className="px-4 py-6">
          <PersonalInfoSection
            isEditing={isEditingPersonal}
            onToggleEdit={() => setIsEditingPersonal(!isEditingPersonal)}
            onSave={handleSubmit(handlePersonalSave)}
            isSaving={isLoading}
            fieldNames={personalFieldNames}
            validationRules={validationRules}
            readOnly={readOnly}
          />

          <AddressSection
            isEditing={isEditingAddress}
            onToggleEdit={() => setIsEditingAddress(!isEditingAddress)}
            onSave={handleSubmit(handleAddressSave)}
            isSaving={isLoading}
            fieldNames={addressFieldNames}
            validationRules={validationRules}
            readOnly={readOnly}
          />
        </View>
      </View>
    </FormProvider>
  );
};
