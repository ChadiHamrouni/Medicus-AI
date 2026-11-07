import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HeaderProps {
  onMenuPress: () => void;
  onFilterPress: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuPress,
  onFilterPress,
}) => {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white shadow-sm">
      <View className="flex-row items-center flex-1">
        <View className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100">
          <MaterialCommunityIcons
            name="menu"
            size={24}
            color="#F05C0C"
            onPress={onMenuPress}
          />
        </View>
        <Text
          className="text-2xl font-bold text-gray-900 flex-1"
          numberOfLines={1}
        >
          Conversations
        </Text>
      </View>
      <View className="p-2 rounded-full active:bg-gray-100">
        <MaterialCommunityIcons
          name="filter-variant"
          size={24}
          color="#F05C0C"
          onPress={onFilterPress}
        />
      </View>
    </View>
  );
};
