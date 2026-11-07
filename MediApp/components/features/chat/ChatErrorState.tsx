import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ChatErrorState: React.FC<ChatErrorStateProps> = ({ error, onRetry }) => {
  return (
    <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
      <Text className="text-red-500 mb-4">Error: {error}</Text>
      <Text className="text-center">
        Unable to connect to the chat service. Please check your internet
        connection and try again.
      </Text>
      <View className="mt-4">
        <Text className="text-orange-500 font-bold" onPress={onRetry}>
          Retry Connection
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ChatErrorState;
