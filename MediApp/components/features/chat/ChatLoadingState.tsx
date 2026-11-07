import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatLoadingState: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-white justify-center items-center">
      <ActivityIndicator size="large" color="#f97316" />
      <Text className="mt-4 text-orange-500">Connecting to chat...</Text>
    </SafeAreaView>
  );
};

export default ChatLoadingState;
