import { MedicalHistory } from '@/components/features/patient/profile';
import { StandardScreenLayout } from '@/components/shared/layout';
import React from 'react';

const MedicalHistoryScreen: React.FC = () => {
  return (
    <StandardScreenLayout
      title="Medical History"
      bottomSpacingColor="bg-gray-50"
    >
      <MedicalHistory />
    </StandardScreenLayout>
  );
};

export default MedicalHistoryScreen;
