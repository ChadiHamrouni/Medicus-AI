import React from 'react';
import { View, Text } from 'react-native';

interface ConversationContentProps {
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isSaraConversation?: boolean;
}

const ConversationContent: React.FC<ConversationContentProps> = ({
  name,
  lastMessage,
  timestamp,
  unreadCount,
  isSaraConversation,
}) => {
  const hasUnread = unreadCount && unreadCount > 0;

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 mr-6">
          <View className="flex-row items-center flex-shrink">
            <Text
              className={`text-base font-semibold ${isSaraConversation ? 'text-blue-600' : 'text-gray-900'}`}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {name}
            </Text>
            {isSaraConversation && (
              <View className="ml-2 bg-blue-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-blue-600 font-medium">AI</Text>
              </View>
            )}
          </View>
        </View>
        <Text className="text-sm text-gray-500 ml-1">{timestamp}</Text>
      </View>
      <View className="flex-row items-center">
        <Text
          className="flex-1 text-sm text-gray-600"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {lastMessage}
        </Text>
        <View
          className={`ml-2 bg-orange-500 rounded-full w-5 h-5 items-center justify-center ${hasUnread ? 'opacity-100' : 'opacity-0'}`}
        >
          <Text className="text-white text-xs">
            {hasUnread ? String(unreadCount) : '0'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ConversationContent;
