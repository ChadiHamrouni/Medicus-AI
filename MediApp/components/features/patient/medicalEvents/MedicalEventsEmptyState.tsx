import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmptyStateProps {
  activeTab: 'upcoming' | 'past';
}

export const MedicalEventsEmptyState: React.FC<EmptyStateProps> = ({
  activeTab,
}) => {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <MaterialCommunityIcons
        name={activeTab === 'upcoming' ? 'calendar-blank' : 'history'}
        size={64}
        color="#D1D5DB"
      />
      <Text className="text-center text-gray-600 mt-4 text-base">
        {activeTab === 'upcoming'
          ? 'No upcoming medical events scheduled'
          : 'No past medical events found'}
      </Text>
      <Text className="text-center text-gray-500 mt-2 text-sm">
        {activeTab === 'upcoming'
          ? 'Your future visits and exams will appear here'
          : 'Completed events will be shown here'}
      </Text>
    </View>
  );
};
