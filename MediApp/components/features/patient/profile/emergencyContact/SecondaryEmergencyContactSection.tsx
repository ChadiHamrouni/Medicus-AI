import React from 'react';
import { emergencyContactValidationRules } from '@/utils';
import type { EmergencyContactData } from '@/stores/patientStore';
import { EmergencyContactSection } from './EmergencyContactSection';

interface SecondaryEmergencyContactSectionProps {
  emergencyContactData: EmergencyContactData;
  onUpdateEmergencyContactData: (_data: Partial<EmergencyContactData>) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving?: boolean;
  readOnly?: boolean;
}

export const SecondaryEmergencyContactSection: React.FC<
  SecondaryEmergencyContactSectionProps
> = ({ isEditing, onToggleEdit, onSave, isSaving = false, readOnly }) => {
  return (
    <EmergencyContactSection
      type="secondary"
      title="Secondary Contact"
      subtitle="Backup contact person (optional)"
      icon="account-plus"
      isEditing={isEditing}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      isSaving={isSaving}
      readOnly={readOnly}
      fieldNames={{
        name: 'secondaryName',
        phone: 'secondaryPhone',
        email: 'secondaryEmail',
        relationship: 'secondaryRelationship',
        countryCode: 'secondaryCountryCode',
      }}
      validationRules={{
        name: emergencyContactValidationRules.secondaryName,
        email: emergencyContactValidationRules.secondaryEmail,
        relationship: emergencyContactValidationRules.secondaryRelationship,
      }}
    />
  );
};
