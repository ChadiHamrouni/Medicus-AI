import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import { OtherSpecialtiesForm } from '@/components/features/doctor/profile';

const OtherSpecialtiesScreen: React.FC = () => {
  return (
    <StandardScreenLayout title="Other Specialties">
      <OtherSpecialtiesForm />
    </StandardScreenLayout>
  );
};

export default OtherSpecialtiesScreen;
