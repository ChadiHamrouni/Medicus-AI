import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { DoctorEvent } from '@/services/doctor/events';
import { DoctorEventCard } from './DoctorEventCard';

interface DoctorCalendarViewProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  markedDates: any;
  events: DoctorEvent[];
  onEventPress?: (event: DoctorEvent) => void;
}

export const DoctorCalendarView: React.FC<DoctorCalendarViewProps> = ({
  selectedDate,
  onDateSelect,
  markedDates,
  events,
  onEventPress,
}) => {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => onDateSelect(day.dateString)}
        markedDates={markedDates}
        markingType={'multi-dot'}
        enableSwipeMonths={true}
        style={{
          height: 360,
          // marginBottom: 10,
        }}
        theme={{
          todayTextColor: '#F05C0C',
          selectedDayBackgroundColor: '#F05C0C',
          arrowColor: '#F05C0C',
          dotColor: '#F05C0C',
        }}
      />
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
            <DoctorEventCard
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
              onViewPress={onEventPress}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};
