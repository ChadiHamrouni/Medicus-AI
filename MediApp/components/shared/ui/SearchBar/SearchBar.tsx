import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, TextInput, View } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (_text: string) => void;
  placeholder?: string;
  onSearch?: (_query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
}) => {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-lg mx-4 my-3 px-3 py-2 shadow-sm">
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color="#9ca3af"
        className="mr-2"
      />
      <TextInput
        className={`flex-1 ${Platform.OS === 'ios' && 'h-10'} text-base`} // To fix problem of the text on android
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};
