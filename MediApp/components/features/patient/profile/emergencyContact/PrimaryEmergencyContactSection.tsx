import React from 'react';
import { emergencyContactValidationRules } from '@/utils';
import type { EmergencyContactData } from '@/stores/patientStore';
import { EmergencyContactSection } from './EmergencyContactSection';

interface PrimaryEmergencyContactSectionProps {
  emergencyContactData: EmergencyContactData;
  onUpdateEmergencyContactData: (_data: Partial<EmergencyContactData>) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  readOnly?: boolean;
}

export const PrimaryEmergencyContactSection: React.FC<
  PrimaryEmergencyContactSectionProps
> = ({ isEditing, onToggleEdit, onSave, isSaving, readOnly }) => {
  return (
    <EmergencyContactSection
      type="primary"
      title="Primary Contact"
      subtitle="Main person to contact in emergencies"
      icon="account-circle"
      isEditing={isEditing}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      isSaving={isSaving}
      readOnly={readOnly}
      fieldNames={{
        name: 'primaryName',
        phone: 'primaryPhone',
        email: 'primaryEmail',
        relationship: 'primaryRelationship',
        countryCode: 'primaryCountryCode',
      }}
      validationRules={{
        name: emergencyContactValidationRules.primaryName,
        email: emergencyContactValidationRules.primaryEmail,
        relationship: emergencyContactValidationRules.primaryRelationship,
      }}
    />
  );
};
