import React, { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Stack, useRouter, useGlobalSearchParams } from 'expo-router';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import { DetailModal } from '@/components/shared/ui/Modal';
import { useDoctorEvents } from '@/hooks/doctor';
import { useAuthContext } from '@/contexts/AuthContext';
import { format, parseISO, isSameDay } from 'date-fns';
import { DoctorEvent, DoctorEventsResponse } from '@/services/doctor/events';
import {
  DoctorCalendarView,
  DoctorEventDetailModalContent,
  ThreeDotsLoader,
} from '@/components';

const CalendarScreen: React.FC = () => {
  const router = useRouter();
  const { authState } = useAuthContext();
  const doctorId = authState.doctorProfile?.id;

  const { date } = useGlobalSearchParams<{ date?: string }>();

  const [selectedDate, setSelectedDate] = useState(() => {
    return date || format(new Date(), 'yyyy-MM-dd');
  });

  const [selectedEvent, setSelectedEvent] = useState<DoctorEvent | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const { data, isLoading, refetch, isError } = useDoctorEvents({
    doctorId: doctorId || 0,
    limit: 500,
  });

  const events = useMemo(() => {
    return (data as DoctorEventsResponse | undefined)?.events || [];
  }, [data]);

  const [refreshing, setRefreshing] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await refetch();
    setIsRetrying(false);
  };

  const markedDates = useMemo(() => {
    const marks: any = {};
    events.forEach((event: DoctorEvent) => {
      const date = event.event_date;
      if (!marks[date]) {
        marks[date] = { dots: [] };
      }

      const color = event.status === 'active' ? '#F05C0C' : '#3B82F6';

      if (!marks[date].dots.find((d: any) => d.color === color)) {
        marks[date].dots.push({ color });
      }
    });

    return {
      ...marks,
      [selectedDate]: {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: '#F05C0C',
      },
    };
  }, [events, selectedDate]);

  const calendarEvents = useMemo(() => {
    return events.filter((event: DoctorEvent) =>
      isSameDay(parseISO(event.event_date), parseISO(selectedDate))
    );
  }, [events, selectedDate]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Event Detail Modal */}
      <DetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        title="Event Details"
      >
        {selectedEvent && (
          <DoctorEventDetailModalContent event={selectedEvent} />
        )}
      </DetailModal>

      <StandardScreenLayout
        title="Calendar"
        onBack={() => router.back()}
        noScroll
      >
        {(isLoading && !refreshing && !data) || isRetrying ? (
          <View className="flex-1 items-center justify-center py-20 px-4">
            <ThreeDotsLoader size={24} />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center py-20 px-4">
            <Text className="text-center text-gray-700 font-semibold text-base mb-4">
              An error occurred while fetching your events.
            </Text>
            <Text
              className="text-center text-orange-600 font-semibold"
              onPress={handleRetry}
            >
              Tap to retry
            </Text>
          </View>
        ) : (
          <DoctorCalendarView
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            markedDates={markedDates}
            events={calendarEvents}
            onEventPress={(event: DoctorEvent) => {
              setSelectedEvent(event);
              setDetailModalVisible(true);
            }}
          />
        )}
      </StandardScreenLayout>
    </>
  );
};

export default CalendarScreen;
