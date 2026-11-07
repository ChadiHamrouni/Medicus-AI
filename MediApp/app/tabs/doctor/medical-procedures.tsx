import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import { ProceduresAndFeesForm } from '@/components/shared/Profile/ProceduresAndFeesForm';
import { useViewingDoctor } from '@/contexts/ViewingDoctorContext';

const MedicalProceduresScreen: React.FC = () => {
  const { isViewingFromConversation, doctorId } = useViewingDoctor();

  return (
    <StandardScreenLayout title="Practice" noScroll={true}>
      <ProceduresAndFeesForm
        readOnly={isViewingFromConversation}
        doctorId={isViewingFromConversation ? doctorId ?? undefined : undefined}
      />
    </StandardScreenLayout>
  );
};

export default MedicalProceduresScreen;
