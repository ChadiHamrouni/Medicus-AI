import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ErrorStateProps {
  error?: string | Error | null;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const errorMessage = error
    ? typeof error === 'string'
      ? error
      : error.message
    : 'Failed to load medical events';

  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color="#EF4444"
      />
      <Text className="text-center text-gray-600 mt-4">{errorMessage}</Text>
      <TouchableOpacity
        className="mt-4 px-6 py-2 bg-orange-500 rounded-lg"
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold">Retry</Text>
      </TouchableOpacity>
    </View>
  );
};
