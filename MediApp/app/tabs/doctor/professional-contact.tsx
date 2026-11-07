import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import { ProfessionalContactForm } from '@/components/features/doctor/profile';
import { useViewingDoctor } from '@/contexts/ViewingDoctorContext';

const ProfessionalContactScreen: React.FC = () => {
  const { isViewingFromConversation, doctorId } = useViewingDoctor();

  return (
    <StandardScreenLayout
      title={isViewingFromConversation ? 'Contact & Addresses' : 'Contact'}
      noScroll={true}
    >
      <ProfessionalContactForm
        readOnly={isViewingFromConversation}
        doctorId={isViewingFromConversation ? doctorId ?? undefined : undefined}
      />
    </StandardScreenLayout>
  );
};

export default ProfessionalContactScreen;
