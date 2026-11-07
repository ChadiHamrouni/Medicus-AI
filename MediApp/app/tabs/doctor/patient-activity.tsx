import React from 'react';
import { Text, View } from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout';

const PatientActivityScreen: React.FC = () => {
  return (
    <StandardScreenLayout title="Patient Activity">
      <View className="flex-1 p-4">
        <View className="bg-gray-50 rounded-lg p-6 items-center justify-center flex-1">
          <Text className="text-lg font-semibold text-gray-700 mb-2">
            Patient Activity
          </Text>
          <Text className="text-gray-500 text-center">
            Patient conversation analytics and activity monitoring will be
            available here.
          </Text>
        </View>
      </View>
    </StandardScreenLayout>
  );
};

export default PatientActivityScreen;
