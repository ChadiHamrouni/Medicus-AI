import { User } from '@/types/user';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface UserItemProps {
  user: User;
  isSelected: boolean;
  onSelect: (_user: User) => void;
}

export const UserItem: React.FC<UserItemProps> = ({
  user,
  isSelected,
  onSelect,
}) => {
  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'doctor':
        return 'Doctor';
      case 'patient':
        return 'Patient';
      case 'assistant':
        return 'Assistant';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getAvatarColors = (type: string) => {
    switch (type) {
      case 'doctor':
        return { bg: 'bg-orange-100', text: 'text-orange-600' };
      case 'patient':
        return { bg: 'bg-orange-50', text: 'text-orange-500' };
      case 'assistant':
        return { bg: 'bg-orange-200', text: 'text-orange-700' };
      default:
        return { bg: 'bg-orange-100', text: 'text-orange-600' };
    }
  };

  const avatarColors = getAvatarColors(user.type);

  return (
    <TouchableOpacity
      className={`flex-row items-center bg-white rounded-xl mb-3 p-4 shadow-sm ${
        isSelected ? 'border-2 border-orange-500' : ''
      }`}
      onPress={() => onSelect(user)}
    >
      <View
        className={`w-[50px] h-[50px] rounded-full ${avatarColors.bg} justify-center items-center`}
      >
        <Text className={`${avatarColors.text} font-semibold text-lg`}>
          {user.avatar}
        </Text>
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-base font-semibold text-gray-800">
          {user.displayName}
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          {getUserTypeLabel(user.type)}
        </Text>
      </View>
      {isSelected && (
        <MaterialCommunityIcons name="check-circle" size={24} color="#f97316" />
      )}
    </TouchableOpacity>
  );
};
