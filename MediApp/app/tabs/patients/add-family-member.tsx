import { AddDependentForm } from '@/components/features/patient/dependents';
import { StandardScreenLayout } from '@/components/shared/layout';
import { useRouter } from 'expo-router';
import React from 'react';

const AddFamilyMemberScreen: React.FC = () => {
  const router = useRouter();

  const handleSuccess = (_dependent: any) => {
    router.push('/tabs/patients');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <StandardScreenLayout title="Add Family Member">
      <AddDependentForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </StandardScreenLayout>
  );
};

export default AddFamilyMemberScreen;
