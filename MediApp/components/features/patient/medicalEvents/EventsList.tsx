import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import type { MedicalEvent } from '@/hooks/patient/useMedicalEvents';
import { EventCard } from './EventCard';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { MedicalEventsEmptyState } from './MedicalEventsEmptyState';

interface EventsListProps {
  events: MedicalEvent[];
  isLoading: boolean;
  error: string | Error | null;
  refreshing: boolean;
  onRefresh: () => void;
  currentLocation: { latitude: number; longitude: number } | null;
  onEventPress: (_event: MedicalEvent) => void;
  activeTab: 'upcoming' | 'past';
}

export const EventsList: React.FC<EventsListProps> = ({
  events,
  isLoading,
  error,
  refreshing,
  onRefresh,
  currentLocation,
  onEventPress,
  activeTab,
}) => {
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
      {isLoading && !refreshing ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={onRefresh} />
      ) : events.length === 0 ? (
        <MedicalEventsEmptyState activeTab={activeTab} />
      ) : (
        <View className="px-4">
          {events.map((event, index) => {
            const hasAdditionalInfo = !!(
              (event.details && event.details !== 'No details provided') ||
              (event.event_details &&
                (typeof event.event_details === 'string' ||
                  Object.keys(event.event_details).length > 0))
            );

            return (
              <EventCard
                key={event.id}
                event={event}
                isLast={index === events.length - 1}
                currentLocation={currentLocation}
                onViewPress={onEventPress}
                showChevron={hasAdditionalInfo}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};
