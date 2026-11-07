import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, View } from 'react-native';
import { LazyImage } from '@/components/common/LazyImage';

interface AvatarProps {
  isCurrentUser: boolean;
  avatar?: string;
  displaySender?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  isCurrentUser,
  avatar,
  displaySender,
}) => {
  if (isCurrentUser) return null;

  // For assistant messages (anything with "Sara" in the name), always show Sara's avatar
  // The sender name will differentiate between "Sara AI Assistant" and "Sara - on behalf of X"
  const isAssistantMessage = displaySender?.startsWith('Sara');

  return (
    <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-2">
      {isAssistantMessage ? (
        <Image
          source={require('@/assets/images/Sara.png')}
          className="w-8 h-8 rounded-full"
        />
      ) : avatar ? (
        <LazyImage
          source={{ uri: avatar }}
          className="w-8 h-8 rounded-full"
          loadingSize="small"
          loadingColor="#9CA3AF"
        />
      ) : (
        <MaterialCommunityIcons name="account" size={20} color="#6B7280" />
      )}
    </View>
  );
};

export default React.memo(Avatar);
