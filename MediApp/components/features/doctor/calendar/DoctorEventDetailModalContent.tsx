import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DoctorEvent } from '@/services/doctor/events';
import { DetailCard } from '@/components/shared/ui/Modal';
import { addToCalendar } from '@/utils/calendar';
import { TouchableOpacity } from 'react-native';

interface DoctorEventDetailModalContentProps {
  event: DoctorEvent;
}

export const DoctorEventDetailModalContent: React.FC<
  DoctorEventDetailModalContentProps
> = ({ event }) => {
  return (
    <>
      {/* Summary */}
      {event.event_summary && (
        <DetailCard>
          <View className="flex-row items-center mb-3 pb-3">
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color="#F05C0C"
            />
            <Text className="text-lg font-semibold text-gray-800 ml-2">
              Summary
            </Text>
          </View>
          <Text className="text-md text-gray-700 leading-5">
            {event.event_summary}
          </Text>
        </DetailCard>
      )}

      {/* Event Details (JSONB data) */}
      {event.event_details && renderEventDetails(event.event_details)}

      {/* Add to Calendar Button */}
      <View className="mt-4 mb-2 items-center">
        <TouchableOpacity
          className="flex-row items-center bg-orange-100 px-5 py-5 rounded-full"
          onPress={() => addToCalendar(event)}
        >
          <MaterialCommunityIcons name="calendar-plus" size={20} color="#F05C0C" />
          <Text className="text-orange-600 font-semibold ml-2">Add to Calendar</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const renderEventDetails = (eventDetails: Record<string, any> | string) => {
  // Handle if event_details is a string
  if (typeof eventDetails === 'string') {
    return (
      <DetailCard>
        <View className="flex-row items-center mb-3 pb-3">
          <MaterialCommunityIcons
            name="file-document-outline"
            size={20}
            color="#F05C0C"
          />
          <Text className="text-lg font-semibold text-gray-800 ml-2">
            Additional Details
          </Text>
        </View>
        <Text className="text-md text-gray-700 leading-5">{eventDetails}</Text>
      </DetailCard>
    );
  }

  // Handle if event_details is an object
  if (
    typeof eventDetails === 'object' &&
    Object.keys(eventDetails).length > 0
  ) {
    return (
      <DetailCard>
        <View className="flex-row items-center mb-3">
          <MaterialCommunityIcons
            name="file-document-outline"
            size={20}
            color="#F05C0C"
          />
          <Text className="text-lg font-semibold text-gray-900 ml-2">
            Additional Details
          </Text>
        </View>
        {Object.entries(eventDetails).map(([key, value], index) => (
          <View key={key}>
            {index > 0 && <View className="bg-gray-100 my-2" />}
            <View className="py-2">
              <Text className="text-lg text-gray-500 mb-1 capitalize">
                {key.replace(/_/g, ' ')}
              </Text>
              <Text className="text-md text-gray-900">
                {typeof value === 'object'
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </Text>
            </View>
          </View>
        ))}
      </DetailCard>
    );
  }

  return null;
};
