import { EmergencyAccessForm } from '@/components/features/patient/profile';
import { StandardScreenLayout } from '@/components/shared/layout';
import React from 'react';

const EmergencyAccessScreen: React.FC = () => {
  return (
    <StandardScreenLayout title="Emergency Access">
      <EmergencyAccessForm />
    </StandardScreenLayout>
  );
};

export default EmergencyAccessScreen;
