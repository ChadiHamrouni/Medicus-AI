import React from 'react';
import { View, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ConversationAvatarProps {
  avatar?: string;
}

const ConversationAvatar: React.FC<ConversationAvatarProps> = ({ avatar }) => {
  return (
    <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-3">
      {avatar ? (
        <Image source={{ uri: avatar }} className="w-12 h-12 rounded-full" />
      ) : (
        <MaterialCommunityIcons name="account" size={24} color="#6B7280" />
      )}
    </View>
  );
};

export default ConversationAvatar;
