import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useForm, FormProvider } from 'react-hook-form';
import {
  useEmergencyContactData,
  useEmergencyContactOperations,
} from '@/hooks/patient/data';
import { PrimaryEmergencyContactSection } from './PrimaryEmergencyContactSection';
import { SecondaryEmergencyContactSection } from './SecondaryEmergencyContactSection';
import { InfoNotice } from '@/components/shared/ui/InfoNotice';
import { formatPhoneNumber, EmergencyContactFormData } from '@/utils';
import { LoadingSpinner } from '@/components/shared';

interface EmergencyContactFormProps {
  readOnly?: boolean;
}

export const EmergencyContactForm: React.FC<EmergencyContactFormProps> = ({
  readOnly,
}) => {
  const {
    emergencyContactData,
    setEmergencyContactData,
    isLoading: isLoadingData,
    isDependentContext,
    currentPatient,
    selectedDependent,
  } = useEmergencyContactData();
  const { handleSaveEmergencyContact, handleSavePrimaryContact, isSaving } =
    useEmergencyContactOperations();

  const formData = useMemo((): EmergencyContactFormData => {
    const list = emergencyContactData?.emergency_contact || [];

    const primaryContact = list.find(c => c.is_primary) ?? list[0];
    const secondaryContact =
      list.find(c => !c.is_primary && c !== primaryContact) ?? list[1];

    const primaryCountryCode = primaryContact?.country_code || 'US';
    const secondaryCountryCode = secondaryContact?.country_code || 'US';

    return {
      primaryName: primaryContact?.name || '',
      primaryPhone: formatPhoneNumber(
        primaryContact?.phone_number || '',
        primaryCountryCode
      ),
      primaryCountryCode: primaryCountryCode,
      primaryEmail: primaryContact?.email || '',
      primaryRelationship: primaryContact?.relationship || '',
      secondaryName: secondaryContact?.name || '',
      secondaryPhone: formatPhoneNumber(
        secondaryContact?.phone_number || '',
        secondaryCountryCode
      ),
      secondaryCountryCode: secondaryCountryCode,
      secondaryEmail: secondaryContact?.email || '',
      secondaryRelationship: secondaryContact?.relationship || '',
    };
  }, [emergencyContactData]);

  const methods = useForm<EmergencyContactFormData>({
    mode: 'onChange',
    defaultValues: {
      primaryName: '',
      primaryPhone: '',
      primaryCountryCode: 'US',
      primaryEmail: '',
      primaryRelationship: '',
      secondaryName: '',
      secondaryPhone: '',
      secondaryCountryCode: 'US',
      secondaryEmail: '',
      secondaryRelationship: '',
    },
    values: formData,
  });

  const [isEditingPrimary, setIsEditingPrimary] = useState(false);
  const [isEditingSecondary, setIsEditingSecondary] = useState(false);

  const { handleSubmit, watch } = methods;

  const formValues = watch();

  const updateEmergencyContactData = (
    updates: Partial<typeof emergencyContactData>
  ) => {
    setEmergencyContactData(prev => ({ ...prev, ...updates }));
  };

  const onSubmit = async (data: EmergencyContactFormData) => {
    const emergencyContactList = [
      {
        name: data.primaryName,
        relationship: data.primaryRelationship,
        phone_number: data.primaryPhone.replace(/\D/g, ''),
        country_code: data.primaryCountryCode,
        email: data.primaryEmail || null,
        address: null,
        is_primary: true,
      },
      {
        name: data.secondaryName,
        relationship: data.secondaryRelationship,
        phone_number: data.secondaryPhone.replace(/\D/g, ''),
        country_code: data.secondaryCountryCode,
        email: data.secondaryEmail || null,
        address: null,
        is_primary: false,
      },
    ].filter(c => Boolean(c.name && c.phone_number && c.relationship));

    const updatedEmergencyContactData = {
      emergency_contact: emergencyContactList,
    };

    setEmergencyContactData(updatedEmergencyContactData);

    const success = await handleSaveEmergencyContact(
      updatedEmergencyContactData,
      currentPatient,
      selectedDependent,
      isDependentContext
    );

    if (success) {
      setIsEditingPrimary(false);
      setIsEditingSecondary(false);
    }
  };

  const handlePrimarySave = async () => {
    const existingList = emergencyContactData?.emergency_contact || [];

    const primaryPayload = {
      name: formValues.primaryName,
      relationship: formValues.primaryRelationship,
      phone_number: formValues.primaryPhone.replace(/\D/g, ''),
      country_code: formValues.primaryCountryCode,
      email: formValues.primaryEmail || null,
      address: null,
      is_primary: true,
    };

    const primaryIndex = existingList.findIndex((c: any) =>
      Boolean(c.is_primary)
    );
    const updatedList = [...existingList];

    if (primaryIndex >= 0) {
      updatedList[primaryIndex] = primaryPayload;
    } else {
      const nonPrimaryList = updatedList.map((c: any) => ({
        ...c,
        is_primary: false,
      }));
      updatedList.splice(
        0,
        updatedList.length,
        primaryPayload,
        ...nonPrimaryList.slice(0, 1)
      );
    }

    const updatedData = {
      emergency_contact: updatedList,
    };

    try {
      const success = await handleSavePrimaryContact(
        updatedData,
        currentPatient,
        selectedDependent,
        isDependentContext
      );
      if (success) {
        setIsEditingPrimary(false);
      }
    } catch { }
  };

  const handleSecondarySave = async () => {
    return handleSubmit(onSubmit)();
  };

  const togglePrimaryEdit = () => setIsEditingPrimary(prev => !prev);
  const toggleSecondaryEdit = () => setIsEditingSecondary(prev => !prev);

  const isLoading = isLoadingData || isSaving;

  // Show loading spinner while fetching emergency contact data
  if (isLoadingData) {
    return (
      <View className="flex-1 items-center justify-center py-24">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <FormProvider {...methods}>
      <View className="flex-1 bg-white px-4 py-6">
        <PrimaryEmergencyContactSection
          emergencyContactData={emergencyContactData}
          onUpdateEmergencyContactData={updateEmergencyContactData}
          isEditing={isEditingPrimary}
          onToggleEdit={togglePrimaryEdit}
          onSave={handlePrimarySave}
          isSaving={isLoading}
          readOnly={readOnly}
        />

        <SecondaryEmergencyContactSection
          emergencyContactData={emergencyContactData}
          onUpdateEmergencyContactData={updateEmergencyContactData}
          isEditing={isEditingSecondary}
          onToggleEdit={toggleSecondaryEdit}
          onSave={handleSecondarySave}
          isSaving={isLoading}
          readOnly={readOnly}
        />


      </View>
    </FormProvider>
  );
};
