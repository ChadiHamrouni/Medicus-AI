import { Button } from '@/components/shared/ui';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

export const PatientInsuranceForm: React.FC = () => {
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
          Insurance Information
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          Manage your health insurance coverage and policy details.
        </Text>
        <View className="p-4 bg-yellow-50 rounded-lg">
          <Text className="text-sm text-yellow-800">
            🚧 This feature is under development.
          </Text>
        </View>
      </View>
      <View className="p-4 border-t border-gray-200 bg-white">
        <Button
          title={isSaving ? 'Saving...' : 'Save Insurance'}
          onPress={handleSave}
          disabled={isSaving}
        />
      </View>
    </View>
  );
};
