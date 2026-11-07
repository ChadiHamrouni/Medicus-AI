import { AppointmentRemindersForm } from '@/components/features/patient/profile';
import { StandardScreenLayout } from '@/components/shared/layout';
import React from 'react';

const AppointmentRemindersScreen: React.FC = () => {
  return (
    <StandardScreenLayout title="Appointment Reminders">
      <AppointmentRemindersForm />
    </StandardScreenLayout>
  );
};

export default AppointmentRemindersScreen;
