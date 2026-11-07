import { AddDependentForm } from '@/components/features/patient/dependents';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import { useRouter } from 'expo-router';
import React from 'react';
import { useDependents } from '@/contexts/DependentsContext';

/**
 * Add Dependent Screen
 * Modal screen for adding a new family member
 */
export default function AddDependentScreen() {
  const router = useRouter();
  const { refreshDependents } = useDependents();

  const handleSuccess = async (_dependent: any) => {
    await refreshDependents();

    // Navigate back to Settings page after successful creation
    // Defer navigation to avoid state update during render
    setTimeout(() => {
      router.replace('/tabs/settings/dependents' as any);
    }, 0);
  };

  const handleCancel = () => {
    setTimeout(() => {
      router.replace('/tabs/settings/dependents' as any);
    }, 0);
  };

  const handleBackPress = () => {
    // Navigate back to Settings page where dependent management belongs
    setTimeout(() => {
      router.replace('/tabs/settings/dependents' as any);
    }, 0);
  };

  return (
    <StandardScreenLayout title="Add a Dependent" onBack={handleBackPress}>
      <AddDependentForm onSuccess={handleSuccess} onCancel={handleCancel} />
      {/* Bottom spacing */}
      {/* <View className="h-20" /> */}
    </StandardScreenLayout>
  );
}
