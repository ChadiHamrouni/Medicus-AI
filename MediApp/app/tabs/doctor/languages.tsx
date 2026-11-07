import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import { LanguagesForm } from '@/components/features/doctor/profile';

const LanguagesScreen: React.FC = () => {
  return (
    <StandardScreenLayout title="Languages">
      <LanguagesForm />
    </StandardScreenLayout>
  );
};

export default LanguagesScreen;
