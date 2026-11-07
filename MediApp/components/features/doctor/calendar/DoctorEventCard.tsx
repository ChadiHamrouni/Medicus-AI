import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { formatEventTime } from '@/utils/date';
import { DoctorEvent } from '@/services/doctor/events';
import {
  calculateDistance,
  formatDistance,
  openInMaps,
} from '@/utils/geolocation';
import { addToCalendar } from '@/utils/calendar';

interface DoctorEventCardProps {
  event: DoctorEvent;
  isLast: boolean;
  currentLocation?: { latitude: number; longitude: number } | null;
  onViewPress?: (event: DoctorEvent) => void;
}

export const DoctorEventCard: React.FC<DoctorEventCardProps> = ({
  event,
  isLast,
  currentLocation,
  onViewPress,
}) => {
  const eventDate = parseISO(event.event_date);
  const dateStr = format(eventDate, 'EEEE, MMMM dd, yyyy');
  const dayOfMonth = format(eventDate, 'dd');
  const month = format(eventDate, 'MMM').toUpperCase();
  const timeStr = event.event_time
    ? formatEventTime(event.event_time)
    : 'TBD';

  // Helper to get icon based on event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return 'hospital-building';
      case 'procedure':
        return 'medical-bag';
      default:
        return 'calendar-clock';
    }
  };

  const handleLocationPress = () => {
    if (event.event_location && event.event_location !== 'N/A') {
      openInMaps(event.event_location);
    }
  };

  const renderLocationContent = () => {
    const location = event.event_location;
    if (
      !location ||
      location === 'N/A' ||
      location === '{}' ||
      location === '"{}"'
    )
      return null;
    try {
      if (location.trim().startsWith('{')) {
        const locObj = JSON.parse(location);

        // 1. Check for standard address schema
        const addressParts = [
          locObj.street ||
          locObj.street_address ||
          locObj.address ||
          locObj.address_line_1,
          locObj.house_number || locObj.number,
          locObj.city,
          locObj.state || locObj.province,
          locObj.postal_code || locObj.zip_code || locObj.zip,
          locObj.country,
        ].filter(Boolean);

        // If it looks like an address, return formatted string
        if (addressParts.length > 0) {
          return (
            <Text className="text-md text-orange-600 ml-2 flex-1">
              {addressParts.join(', ')}
            </Text>
          );
        }

        // 2. If valid JSON but not a typical address
        const hasKeys = Object.keys(locObj).length > 0;
        if (!hasKeys) return null;

        return (
          <View className="ml-2 flex-1">
            {Object.entries(locObj).map(([key, value]) => (
              <Text key={key} className="text-md text-orange-600">
                <Text className="font-semibold capitalize">
                  {key.replace(/_/g, ' ')}:
                </Text>{' '}
                {String(value)}
              </Text>
            ))}
          </View>
        );
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    // 3. Fallback to raw string
    return (
      <Text className="text-md text-orange-600 ml-2 flex-1">{location}</Text>
    );
  };

  const locationContent = renderLocationContent();

  return (
    <View className={`py-4 ${!isLast ? 'border-b border-gray-200' : ''}`}>
      <View className="flex-row">
        {/* Date Display */}
        <View className="items-center" style={{ width: 50 }}>
          <Text className="text-2xl font-bold text-orange-600">
            {dayOfMonth}
          </Text>
          <Text className="text-sm text-gray-500 uppercase">{month}</Text>
        </View>

        {/* Event Details */}
        <View className="flex-1">
          {/* Event Type Icon and Title with View Button */}
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-row items-start flex-1">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-orange-100">
                <MaterialCommunityIcons
                  name={getEventIcon(event.event_type) as any}
                  size={24}
                  color="#F05C0C"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-medium text-gray-900">
                  {event.patient_name}
                </Text>
                <Text className="text-md text-gray-500 capitalize mt-0.5">
                  {event.event_type}
                  {event.event_name ? ` • ${event.event_name}` : ''}
                </Text>
              </View>
            </View>
            {onViewPress && (
              <TouchableOpacity
                onPress={() => onViewPress(event)}
                className="ml-2 w-8 h-8 items-center justify-center"
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Date and Time */}
          <View className="flex-row items-center mb-1.5">
            <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
            <Text className="text-md text-gray-700 ml-2">{dateStr}</Text>
          </View>

          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color="#6B7280"
            />
            <Text className="text-md text-gray-700 ml-2 font-medium">
              {timeStr}
            </Text>
          </View>

          {/* Location */}
          {locationContent && (
            <TouchableOpacity
              className="flex-row items-start mb-2"
              onPress={handleLocationPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color="#F05C0C"
                style={{ marginTop: 2 }}
              />
              {locationContent}
            </TouchableOpacity>
          )}

          {/* Summary */}
          {event.event_summary && (
            <View className="mt-2 p-3 bg-gray-50 rounded-lg">
              <Text className="text-md text-gray-600">
                {event.event_summary}
              </Text>
            </View>
          )}

          {/* Add to Calendar Button */}
          <View className="mt-3 pt-3 flex-row justify-start">
            <TouchableOpacity
              className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-full"
              onPress={() => addToCalendar(event)}
            >
              <MaterialCommunityIcons
                name="calendar-plus"
                size={16}
                color="#F05C0C"
              />
              <Text className="text-orange-600 text-sm font-medium ml-1.5">
                Add to Calendar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
