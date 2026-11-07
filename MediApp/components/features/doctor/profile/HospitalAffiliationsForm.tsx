import { Button, Footer } from '@/components/shared/ui';
import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';

export const HospitalAffiliationsForm: React.FC = () => {
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
          Hospital Affiliations
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          List the hospitals and medical facilities you are affiliated with.
        </Text>
        <View className="p-4 bg-yellow-50 rounded-lg">
          <Text className="text-sm text-yellow-800">
            🚧 This feature is under development.
          </Text>
        </View>
      </View>
      <Footer>
        <Button
          title="Save Affiliations"
          onPress={handleSave}
          loading={isSaving}
        />
      </Footer>
    </View>
  );
};
