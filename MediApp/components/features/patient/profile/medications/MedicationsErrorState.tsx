import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MedicationsErrorStateProps {
  error: string;
  isLoading: boolean;
  onRefresh: () => void;
  onClearError: () => void;
}

export const MedicationsErrorState: React.FC<MedicationsErrorStateProps> = ({
  error,
  isLoading,
  onRefresh,
  onClearError,
}) => {
  const handleRefresh = () => {
    onClearError();
    onRefresh();
  };

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <View className="px-4 py-6">
          <View className="bg-red-50 rounded-xl p-8 items-center border border-red-200">
            <MaterialCommunityIcons
              name="alert-circle"
              size={48}
              color="#EF4444"
            />
            <Text className="text-lg font-semibold text-red-600 mt-4 mb-2">
              Error Loading Medications
            </Text>
            <Text className="text-sm text-red-500 text-center mb-4">
              {error}
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              Pull down to retry loading your medications
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
