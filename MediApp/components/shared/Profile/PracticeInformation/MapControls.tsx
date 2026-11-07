import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type MapControlsProps = {
  onLocatePress: () => void;
};

export const MapControls: React.FC<MapControlsProps> = ({ onLocatePress }) => {
  return (
    <View className="absolute bottom-2 right-2 flex-row">
      <TouchableOpacity
        className="bg-white p-2 rounded-full shadow-md mr-2"
        onPress={onLocatePress}
      >
        <Ionicons name="locate" size={24} color="#F05C0C" />
      </TouchableOpacity>
    </View>
  );
};
