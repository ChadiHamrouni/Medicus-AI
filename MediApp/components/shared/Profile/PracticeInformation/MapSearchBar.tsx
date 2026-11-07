import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type MapSearchBarProps = {
  searchQuery: string;
  setSearchQuery: (_query: string) => void;
  onSearch: () => void;
};

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
}) => {
  return (
    <View className="p-3 border-b border-gray-200">
      <View className="flex-row items-center border border-gray-300 rounded-lg overflow-hidden">
        <RNTextInput
          className={`flex-1 ${Platform.OS === 'ios' && 'h-10'} px-3 text-base`}
          placeholder="Search for an address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          className="px-3 h-10 justify-center"
          onPress={onSearch}
        >
          <Ionicons name="search" size={20} color="#F05C0C" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
