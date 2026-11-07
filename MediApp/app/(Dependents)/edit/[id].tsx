import { EditDependentForm } from '@/components/features/patient/dependents';
import { StandardScreenLayout } from '@/components/shared/layout';
import { usePatient } from '@/contexts/PatientContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

/**
 * Edit Dependent Screen
 * Allows editing of dependent information
 */
export default function EditDependentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    dependents,
    isLoading: dependentsLoading,
    error: dependentsError,
    refresh,
  } = usePatient();

  const handleSuccess = async (_updatedDependent: any) => {
    await refresh();
    // Navigate back to dependents list
    router.replace('/tabs/settings/dependents');
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDelete = async () => {
    await refresh();
    // Navigate back to dependents list
    router.replace('/tabs/settings/dependents');
  };

  const handleBackPress = () => {
    // Navigate back to Family Members screen instead of using router.back()
    router.replace('/tabs/settings/dependents');
  };

  if (dependentsLoading) {
    return (
      <StandardScreenLayout title="Edit Dependent" onBack={handleBackPress}>
        <View className="flex-1 bg-white justify-center items-center py-20">
          <ActivityIndicator size="large" color="#F05C0C" />
          <Text className="mt-4 text-gray-600">
            Loading dependent information...
          </Text>
        </View>
      </StandardScreenLayout>
    );
  }

  if (dependentsError) {
    return (
      <StandardScreenLayout title="Edit Dependent" onBack={handleBackPress}>
        <View className="flex-1 justify-center items-center px-4 py-20">
          <Text className="text-red-600 text-center mb-4 text-lg">
            Failed to load dependent information
          </Text>
          <Text className="text-gray-600 text-center mb-4">
            {typeof dependentsError === 'string'
              ? dependentsError
              : 'An error occurred'}
          </Text>
        </View>
      </StandardScreenLayout>
    );
  }

  // Find the dependent to edit
  const dependent = dependents.find((d: any) => d.id.toString() === id);

  if (!dependent) {
    return (
      <StandardScreenLayout title="Edit Dependent" onBack={handleBackPress}>
        <View className="flex-1 justify-center items-center px-4 py-20">
          <Text className="text-red-600 text-center mb-4 text-lg">
            Dependent Not Found
          </Text>
          <Text className="text-gray-600 text-center mb-4">
            The dependent you're trying to edit could not be found.
          </Text>
        </View>
      </StandardScreenLayout>
    );
  }

  return (
    <StandardScreenLayout
      title="Edit Dependent"
      onBack={handleBackPress}
      noScroll
    >
      <EditDependentForm
        dependent={dependent as any}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />
    </StandardScreenLayout>
  );
}
