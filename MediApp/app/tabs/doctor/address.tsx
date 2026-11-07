import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import { AddressForm } from '@/components/features/doctor/profile';
import { useViewingDoctor } from '@/contexts/ViewingDoctorContext';

const AddressScreen: React.FC = () => {
  const { isViewingFromConversation, doctorId } = useViewingDoctor();

  return (
    <StandardScreenLayout title="Addresses" noScroll={true}>
      <AddressForm
        readOnly={isViewingFromConversation}
        doctorId={isViewingFromConversation ? doctorId ?? undefined : undefined}
      />
    </StandardScreenLayout>
  );
};

export default AddressScreen;
