import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import { WorkingHoursForm } from '@/components/shared/Profile/WorkingHoursForm';
import { useViewingDoctor } from '@/contexts/ViewingDoctorContext';

const WorkingHoursScreen: React.FC = () => {
  const { isViewingFromConversation, doctorId } = useViewingDoctor();

  return (
    <StandardScreenLayout title="Working Hours" noScroll={true}>
      <WorkingHoursForm
        readOnly={isViewingFromConversation}
        doctorId={isViewingFromConversation ? doctorId ?? undefined : undefined}
      />
    </StandardScreenLayout>
  );
};

export default WorkingHoursScreen;
