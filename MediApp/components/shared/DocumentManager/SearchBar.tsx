import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, View } from 'react-native';

export type DocumentSearchBarProps = {
  searchQuery: string;
  onSearchChange: (_text: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export function DocumentSearchBar({
  searchQuery,
  onSearchChange,
  placeholder = 'Search documents...',
  className = 'mb-4',
  inputClassName = 'flex-1 ml-2 text-base text-gray-900',
}: DocumentSearchBarProps) {
  return (
    <View className={className}>
      <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2 mb-3">
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput
          className={inputClassName}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>
    </View>
  );
}
