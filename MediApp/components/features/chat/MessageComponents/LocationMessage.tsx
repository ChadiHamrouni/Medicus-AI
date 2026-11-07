import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LocationData } from '../MessageInput/utils/LocationHandler';

interface LocationMessageProps {
  locationData: LocationData;
  onPress: () => void;
}

const LocationMessage: React.FC<LocationMessageProps> = ({
  locationData,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress} className="w-full">
      <View className="bg-gray-200 p-2 rounded-lg mb-2">
        <View className="flex-row items-center mb-2">
          <MaterialIcons name="location-on" size={20} color="#F05C0C" />
          <Text className="text-sm font-medium ml-1">Location Shared</Text>
        </View>
        <Text className="text-xs text-gray-700">
          Lat: {locationData.latitude.toFixed(6)}
        </Text>
        <Text className="text-xs text-gray-700">
          Long: {locationData.longitude.toFixed(6)}
        </Text>
        {locationData.address && (
          <Text className="text-xs text-gray-700 mt-1">
            {locationData.address}
          </Text>
        )}
      </View>
      <Text className="text-xs text-blue-500">Tap to open in Maps</Text>
    </TouchableOpacity>
  );
};

export default React.memo(LocationMessage);
