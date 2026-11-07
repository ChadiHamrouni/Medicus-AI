import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface VaccineCardProps {
  vaccine: {
    vaccine: string;
    date: string;
    notes?: string;
  };
  onPress: () => void;
  isLast: boolean;
}

export const VaccineCard: React.FC<VaccineCardProps> = ({
  vaccine,
  onPress,
  isLast,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`bg-white py-3 ${!isLast ? 'border-b border-gray-200' : ''}`}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        {/* Date on the left */}
        <View className="mr-4">
          <Text className="text-2xl font-bold text-orange-600">
            {format(new Date(vaccine.date), 'dd')}
          </Text>
          <Text className="text-xs text-gray-500 uppercase">
            {format(new Date(vaccine.date), 'MMM')}
          </Text>
        </View>

        {/* Icon and vaccine info */}
        <View className="flex-1 flex-row items-center">
          <MaterialCommunityIcons name="needle" size={24} color="#10B981" />
          <View className="flex-1 ml-3">
            <Text className="text-base font-semibold text-gray-900">
              {vaccine.vaccine}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {format(new Date(vaccine.date), 'MMMM dd, yyyy')}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#D1D5DB"
        />
      </View>
    </TouchableOpacity>
  );
};
