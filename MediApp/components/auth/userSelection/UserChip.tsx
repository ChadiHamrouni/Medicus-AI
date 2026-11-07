import { User } from '@/types/user';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface UserChipProps {
  user: User;
  onPress?: (_user: User) => void;
}

export const UserChip: React.FC<UserChipProps> = ({ user, onPress }) => {
  return (
    <TouchableOpacity
      onPress={() => onPress?.(user)}
      className="items-center mr-3"
      activeOpacity={0.8}
    >
      <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center">
        <Text className="text-orange-600 font-semibold">{user.avatar}</Text>
      </View>
      <Text
        className="text-xs text-gray-700 mt-1 max-w-[64px]"
        numberOfLines={1}
      >
        {user.displayName}
      </Text>
    </TouchableOpacity>
  );
};
