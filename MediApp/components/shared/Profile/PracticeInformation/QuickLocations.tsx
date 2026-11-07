import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

type QuickLocationsProps = {
  onLocationSelect: (_locationName: string) => void;
};

export const QuickLocations: React.FC<QuickLocationsProps> = ({
  onLocationSelect,
}) => {
  const quickLocations = ['Tunis', 'Sousse', 'Sfax'];

  return (
    <View className="px-4 py-2 border-t border-b border-gray-200">
      <Text className="text-sm text-gray-500 mb-2">Quick Locations:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {quickLocations.map(location => (
          <TouchableOpacity
            key={location}
            className="bg-gray-100 px-3 py-1 rounded-full mr-2"
            onPress={() => onLocationSelect(location)}
          >
            <Text>{location}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
