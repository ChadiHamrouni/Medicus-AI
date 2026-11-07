import {
  EmergencyContactForm,
  StandardScreenLayout,
  ThreeDotsLoader,
} from '@/components';
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useEmergencyContactData } from '@/hooks/patient/data';
import { ScrollView } from 'react-native-gesture-handler';

const EmergencyContactScreen: React.FC = () => {
  const { isLoading, error, refetch, isViewingAsDoctor } = useEmergencyContactData();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (refetch) {
      setIsRetrying(true);
      await refetch();
      setIsRetrying(false);
    }
  };

  if (isLoading || isRetrying) {
    return (
      <StandardScreenLayout
        title="Emergency Contact"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <ThreeDotsLoader size={24} />
        </View>
      </StandardScreenLayout>
    );
  }

  if (error) {
    return (
      <StandardScreenLayout
        title="Emergency Contact"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your emergency contact.
          </Text>
          <Text
            className="text-center text-orange-600 font-semibold"
            onPress={handleRetry}
          >
            Tap to retry
          </Text>
        </View>
      </StandardScreenLayout>
    );
  }

  return (
    <StandardScreenLayout title="Emergency Contact" noScroll>
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
          <EmergencyContactForm readOnly={isViewingAsDoctor} />
          <View className="h-32" />
        </ScrollView>
      </View>
    </StandardScreenLayout>
  );
};

export default EmergencyContactScreen;
