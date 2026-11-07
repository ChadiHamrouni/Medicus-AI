import React, { useState, useMemo, useEffect } from 'react';
import { Text, View } from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import { DetailModal } from '@/components/shared/ui/Modal';
import { Stack, useRouter, useGlobalSearchParams } from 'expo-router';
import { useMedicalEvents } from '@/hooks/patient/useMedicalEvents';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { format, parseISO, isSameDay } from 'date-fns';
import type { MedicalEvent } from '@/hooks/patient/useMedicalEvents';
import { getCurrentLocation } from '@/utils/geolocation';
import { hasAdditionalDetails } from '@/components/features/patient/medicalEvents/utils';
import {
  CalendarView,
  EventDetailModalContent,
  ThreeDotsLoader,
} from '@/components';

const MedicalEventsScreen: React.FC = () => {
  const router = useRouter();
  const { authState } = useAuthContext();
  const { selectedDependent } = useDependents();
  const { date } = useGlobalSearchParams<{ date?: string }>();
  const [selectedDate, setSelectedDate] = useState(() => {
    const initialDate = date || format(new Date(), 'yyyy-MM-dd');
    console.log('HealthCalendar initialized date', {
      component: 'HealthCalendar',
      deepLinkDate: date,
      resolvedDate: initialDate,
    });
    return initialDate;
  });

  // Detail modal state
  const [selectedEvent, setSelectedEvent] = useState<MedicalEvent | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const patientId =
    selectedDependent === 'main'
      ? authState.patientProfile?.id || null
      : typeof selectedDependent === 'number'
        ? selectedDependent
        : null;

  const { upcomingEvents, pastEvents, isLoading, error, refetch } =
    useMedicalEvents(patientId, true);

  const [refreshing, setRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get current location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    };
    fetchLocation();
  }, []);

  // Log whenever selectedDate changes
  useEffect(() => {
    console.log('HealthCalendar date selection changed', {
      component: 'HealthCalendar',
      newDate: selectedDate,
    });
  }, [selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await refetch();
    setIsRetrying(false);
  };

  const markedDates = useMemo(() => {
    const marks: any = {};

    const allEvents = [...upcomingEvents, ...pastEvents];

    allEvents.forEach(event => {
      const date = event.date.split('T')[0];
      if (!marks[date]) {
        marks[date] = { dots: [] };
      }

      const color = event.status === 'upcoming' ? '#F05C0C' : '#3B82F6';

      // Avoid duplicate dots of same color
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
  }, [upcomingEvents, pastEvents, selectedDate]);

  const calendarEvents = useMemo(() => {
    const allEvents = [...upcomingEvents, ...pastEvents];
    return allEvents.filter(event =>
      isSameDay(parseISO(event.date), parseISO(selectedDate))
    );
  }, [upcomingEvents, pastEvents, selectedDate]);

  if ((isLoading && !refreshing) || isRetrying) {
    return (
      <StandardScreenLayout
        title="Health Calendar"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <ThreeDotsLoader size={24} />
        </View>
      </StandardScreenLayout>
    );
  }

  if (error) {
    return (
      <StandardScreenLayout
        title="Health Calendar"
        bottomSpacingColor="bg-gray-50"
      >
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your event details.
          </Text>
          <Text
            className="text-center text-orange-600 font-semibold"
            onPress={handleRetry}
          >
            Tap to retry
          </Text>
        </View>
      </StandardScreenLayout>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Event Detail Modal */}
      <DetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        title="Event Details"
      >
        {selectedEvent && <EventDetailModalContent event={selectedEvent} />}
      </DetailModal>

      <StandardScreenLayout
        title="Health Calendar"
        onBack={() => router.back()}
        noScroll
      >
        <View className="flex-1 bg-white">
          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            markedDates={markedDates}
            events={calendarEvents}
            currentLocation={currentLocation}
            onEventPress={event => {
              if (hasAdditionalDetails(event)) {
                setSelectedEvent(event);
                setDetailModalVisible(true);
              }
            }}
          />
        </View>
      </StandardScreenLayout>
    </>
  );
};

export default MedicalEventsScreen;
