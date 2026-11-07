import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUpcomingEventsSummary } from '@/hooks/patient/useMedicalEvents';
import { format, parseISO } from 'date-fns';

interface MedicalEventsCardProps {
  patientId: number | null;
}

const getEventIcon = (event: any): any => {
  const examType = event.exam_type?.toLowerCase() || '';
  const title = event.title.toLowerCase();

  // Visit types
  if (event.type === 'visit') {
    if (title.includes('follow')) return 'calendar-check';
    if (title.includes('consultation')) return 'comment-text';
    if (title.includes('checkup') || title.includes('check-up'))
      return 'clipboard-pulse';
    if (title.includes('emergency')) return 'ambulance';
    return 'stethoscope';
  }

  // Examination types
  if (
    examType === 'lab_test' ||
    title.includes('lab') ||
    title.includes('test')
  ) {
    return 'flask';
  }
  if (examType === 'ct_scan' || title.includes('ct')) {
    return 'scan-helper';
  }
  if (examType === 'mri' || title.includes('mri')) {
    return 'magnify-scan';
  }
  if (examType === 'ultrasound' || title.includes('ultrasound')) {
    return 'waveform';
  }
  if (
    examType === 'x_ray' ||
    title.includes('x-ray') ||
    title.includes('xray')
  ) {
    return 'radiator';
  }
  if (examType === 'hospitalization' || title.includes('hospital')) {
    return 'hospital-building';
  }
  if (title.includes('blood')) return 'water';
  if (title.includes('cardiac') || title.includes('heart'))
    return 'heart-pulse';
  if (title.includes('eye') || title.includes('vision')) return 'eye';
  if (title.includes('dental') || title.includes('teeth')) return 'tooth';

  // Default icon for exams
  return 'medical-bag';
};

export const MedicalEventsCard: React.FC<MedicalEventsCardProps> = ({
  patientId,
}) => {
  const router = useRouter();
  const { nextEvents, upcomingCount, isLoading } =
    useUpcomingEventsSummary(patientId);

  const handlePress = () => {
    router.push('/tabs/patients/medical-events');
  };

  if (isLoading) {
    return (
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm p-4">
        <ActivityIndicator size="small" color="#F05C0C" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm active:opacity-70"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="calendar-clock"
                size={20}
                color="#F05C0C"
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                Health Calendar
              </Text>
              <Text className="text-xs text-gray-600">
                Visits and examinations
              </Text>
            </View>
          </View>

          {/* Badge */}
          {upcomingCount > 0 && (
            <View className="bg-orange-500 rounded-full px-2.5 py-1 ml-2">
              <Text className="text-white text-xs font-bold">
                {upcomingCount}
              </Text>
            </View>
          )}
        </View>

        {/* Event List */}
        {upcomingCount > 0 && (
          <View className="mt-1">
            {nextEvents.map((event, index) => {
              const eventDate = parseISO(event.date);

              const isLast = index === nextEvents.length - 1;

              return (
                <View
                  key={event.id}
                  className={`py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-row items-start">
                    <View className="mr-3 items-center" style={{ width: 40 }}>
                      <Text className="text-xs font-bold text-orange-600">
                        {format(eventDate, 'MMM').toUpperCase()}
                      </Text>
                      <Text className="text-lg font-bold text-gray-900">
                        {format(eventDate, 'dd')}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {event.title}
                      </Text>
                      {event.doctor_name && (
                        <Text className="text-xs text-gray-600 mt-0.5">
                          Dr. {event.doctor_name}
                          {event.specialty && ` • ${event.specialty}`}
                        </Text>
                      )}
                      <View className="flex-row items-center mt-1">
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={12}
                          color="#6B7280"
                        />
                        <Text className="text-xs text-gray-500 ml-1">
                          {event.time}
                        </Text>
                        {event.location && (
                          <>
                            <MaterialCommunityIcons
                              name="map-marker-outline"
                              size={12}
                              color="#6B7280"
                              className="ml-2"
                            />
                            <Text className="text-xs text-gray-500 ml-1">
                              {event.location}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>

                    <MaterialCommunityIcons
                      name={getEventIcon(event)}
                      size={36}
                      color="#F05C0C"
                    />
                  </View>
                </View>
              );
            })}

            {/* View All Link */}
            {upcomingCount > 3 && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-sm text-orange-600 font-medium text-center">
                  +{upcomingCount - 3} more events • Tap to view all
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Chevron Icon */}
        <View className="absolute right-4 top-4">
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#9CA3AF"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};
