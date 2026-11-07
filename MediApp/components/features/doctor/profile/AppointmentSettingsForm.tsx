import { Button, Footer } from '@/components/shared/ui';
import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';

export const AppointmentSettingsForm: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error saving appointment settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <View className="flex-1">
      <View className="px-4 py-6">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Appointment Settings
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          Configure your appointment duration, buffer times, and appointment
          types.
        </Text>

        <View className="p-4 bg-yellow-50 rounded-lg">
          <Text className="text-sm text-yellow-800">
            🚧 This feature is under development. You can configure appointment
            settings through your existing practice management system for now.
          </Text>
        </View>
      </View>

      <Footer>
        <Button title="Save Settings" onPress={handleSave} loading={isSaving} />
      </Footer>
    </View>
  );
};
