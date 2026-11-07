import {
  ContactDetailsForm,
  StandardScreenLayout,
  ThreeDotsLoader,
} from '@/components';
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useContactData } from '@/hooks';
import { ScrollView } from 'react-native-gesture-handler';

const ContactDetailsScreen: React.FC = () => {
  const { isLoading, error, refetch, isViewingAsDoctor } = useContactData();
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
        title="Contact Details"
        bottomSpacingColor="bg-white"
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
        title="Contact Details"
        bottomSpacingColor="bg-white"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your contact details.
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
    <StandardScreenLayout
      title="Contact Details"
      bottomSpacingColor="bg-white"
      noScroll
    >
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
          <ContactDetailsForm readOnly={isViewingAsDoctor} />
          <View className="h-32" />
        </ScrollView>
      </View>
    </StandardScreenLayout>
  );
};

export default ContactDetailsScreen;
