import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThreeDotsLoader } from '@/components/shared/ui';

interface EmptyStateProps {
  isLoading?: boolean;
  icon: string;
  message: string;
}

export const HealthProfileEmptyState: React.FC<EmptyStateProps> = ({
  isLoading = false,
  icon,
  message,
}) => {
  if (isLoading) {
    return (
      <View className="w-full items-center py-12">
        <ThreeDotsLoader size={14} />
      </View>
    );
  }

  return (
    <View className="w-full items-center py-12">
      <MaterialCommunityIcons name={icon as any} size={48} color="#D1D5DB" />
      <Text className="text-gray-500 mt-3 text-sm">{message}</Text>
    </View>
  );
};
