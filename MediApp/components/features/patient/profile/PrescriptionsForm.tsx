import { StandardBottomButton } from '@/components/shared/ui';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

export const PrescriptionsForm: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <View className="flex-1">
      <View className="px-4 py-6">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Active Prescriptions
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          View and manage your current prescriptions from healthcare providers.
        </Text>
        <View className="p-4 bg-yellow-50 rounded-lg">
          <Text className="text-sm text-yellow-800">
            🚧 This feature is under development.
          </Text>
        </View>
      </View>
      <View className="p-4 border-t border-gray-200 bg-white">
        <StandardBottomButton
          onPress={handleSave}
          label={isSaving ? 'Saving...' : 'Save Prescriptions'}
          isLoading={isSaving}
          isDisabled={isSaving}
        />
      </View>
    </View>
  );
};
