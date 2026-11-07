import { Button, Footer } from '@/components/shared/ui';
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput } from 'react-native';

export const AutoResponseForm: React.FC = () => {
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error saving auto-response:', error);
    } finally {
      setIsSaving(false);
    }
  }, [outOfOfficeMessage, emergencyMessage]);

  return (
    <View className="flex-1">
      <View className="px-4 py-6">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Auto-Response Messages
        </Text>
        <Text className="text-sm text-gray-600 mb-6">
          Set up automatic response messages for when you are out of office or
          for emergency situations.
        </Text>

        <View className="space-y-4">
          <View>
            <Text className="text-base font-medium text-gray-700 mb-2">
              Out of Office Message
            </Text>
            <TextInput
              placeholder="Thank you for contacting us. We are currently out of office..."
              value={outOfOfficeMessage}
              onChangeText={setOutOfOfficeMessage}
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-lg p-3 text-base"
              style={{ minHeight: 100 }}
            />
          </View>

          <View>
            <Text className="text-base font-medium text-gray-700 mb-2">
              Emergency Contact Message
            </Text>
            <TextInput
              placeholder="For medical emergencies, please call 911 or go to your nearest emergency room..."
              value={emergencyMessage}
              onChangeText={setEmergencyMessage}
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-lg p-3 text-base"
              style={{ minHeight: 100 }}
            />
          </View>
        </View>
      </View>

      <Footer>
        <Button title="Save Messages" onPress={handleSave} loading={isSaving} />
      </Footer>
    </View>
  );
};
