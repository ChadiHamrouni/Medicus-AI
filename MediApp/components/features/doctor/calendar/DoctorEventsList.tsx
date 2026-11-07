import React from 'react';
import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { DoctorEvent } from '@/services/doctor/events';
import { DoctorEventCard } from './DoctorEventCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DoctorEventsListProps {
  events: DoctorEvent[];
  isLoading: boolean;
  error: unknown;
  refreshing: boolean;
  onRefresh: () => void;
  onEventPress?: (event: DoctorEvent) => void;
  activeTab: 'upcoming' | 'past';
}

export const DoctorEventsList: React.FC<DoctorEventsListProps> = ({
  events,
  isLoading,
  error,
  refreshing,
  onRefresh,
  onEventPress,
  activeTab,
}) => {
  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <MaterialCommunityIcons name="loading" size={32} color="#F05C0C" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-20 px-4">
        <Text className="text-center text-gray-700 font-semibold text-base mb-4">
          An error occurred while fetching events.
        </Text>
        <Text
          className="text-center text-orange-600 font-semibold"
          onPress={onRefresh}
        >
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 20 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#F05C0C"
        />
      }
    >
      {events.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20 px-4">
          <MaterialCommunityIcons
            name="calendar-blank"
            size={48}
            color="#9CA3AF"
          />
          <Text className="text-gray-500 text-center mt-4 text-base">
            No {activeTab} events found.
          </Text>
        </View>
      ) : (
        <View className="px-4">
          {events.map((event, index) => (
            <DoctorEventCard
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
              onViewPress={onEventPress}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};
