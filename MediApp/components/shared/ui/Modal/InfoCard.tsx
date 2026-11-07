import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface InfoCardProps {
  icon: string;
  label: string;
  content: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({ icon, label, content }) => {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-start">
        <MaterialCommunityIcons name={icon as any} size={20} color="#F05C0C" />
        <View className="flex-1 ml-3">
          <Text className="text-xs text-gray-500 mb-1">{label}</Text>
          <Text className="text-sm text-gray-900 leading-5">{content}</Text>
        </View>
      </View>
    </View>
  );
};
