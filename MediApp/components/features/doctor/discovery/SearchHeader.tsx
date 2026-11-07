import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface SearchHeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchQuery,
  onSearch,
  placeholder = 'Search by doctor name or specialty...',
}) => {
  return (
    <View className="px-4 mb-6">
      <View className="mb-4">
        <Text className="text-lg font-bold text-gray-900 mb-3">
          Search Doctors
        </Text>
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-200">
          <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={onSearch}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-base text-gray-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default SearchHeader;
