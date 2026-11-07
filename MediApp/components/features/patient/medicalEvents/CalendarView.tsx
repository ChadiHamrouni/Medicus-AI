import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import type { MedicalEvent } from '@/hooks/patient/useMedicalEvents';
import { hasAdditionalDetails } from './utils';
import { EventCard } from './EventCard';

interface CalendarViewProps {
  selectedDate: string;
  onDateSelect: (_date: string) => void;
  markedDates: any;
  events: MedicalEvent[];
  currentLocation: { latitude: number; longitude: number } | null;
  onEventPress: (_event: MedicalEvent) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onDateSelect,
  markedDates,
  events,
  currentLocation,
  onEventPress,
}) => {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View style={{ height: 360 }}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: DateData) => onDateSelect(day.dateString)}
          markedDates={markedDates}
          markingType={'multi-dot'}
          theme={{
            todayTextColor: '#F05C0C',
            selectedDayBackgroundColor: '#F05C0C',
            arrowColor: '#F05C0C',
            dotColor: '#F05C0C',
            stylesheet: {
              calendar: {
                main: {
                  height: 360,
                },
              },
            },
          }}
        />
      </View>
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="font-semibold text-gray-700">
          Events for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
        </Text>
      </View>
      <View className="p-4">
        {events.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-500">No events for this day</Text>
          </View>
        ) : (
          events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
              currentLocation={currentLocation}
              onViewPress={onEventPress}
              showChevron={hasAdditionalDetails(event)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};
