import { PrescriptionsForm } from '@/components/features/patient/profile';
import { StandardScreenLayout } from '@/components/shared/layout';
import React from 'react';

const PrescriptionsScreen: React.FC = () => {
  return (
    <StandardScreenLayout title="Prescriptions">
      <PrescriptionsForm />
    </StandardScreenLayout>
  );
};

export default PrescriptionsScreen;
