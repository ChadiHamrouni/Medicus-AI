import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { formatEventTime } from '@/utils/date';
import { MedicalEvent } from '@/hooks/patient/useMedicalEvents';
import {
  calculateDistance,
  formatDistance,
  openInMaps,
} from '@/utils/geolocation';
import { getEventIcon } from './utils';
import { addToCalendar } from '@/utils/calendar';

interface EventCardProps {
  event: MedicalEvent;
  isLast: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  onViewPress: (_event: MedicalEvent) => void;
  showChevron?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isLast,
  currentLocation,
  onViewPress,
  showChevron = true,
}) => {
  const eventDate = parseISO(event.date);
  const dateStr = format(eventDate, 'EEEE, MMMM dd, yyyy');
  const dayOfMonth = format(eventDate, 'dd');
  const month = format(eventDate, 'MMM').toUpperCase();

  // Calculate distance if we have both current location and event coordinates
  const distanceText = useMemo(() => {
    if (!currentLocation || !event.location || event.location === 'N/A') {
      return null;
    }

    // Use coordinates from backend if available
    if (event.latitude && event.longitude) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        event.latitude,
        event.longitude
      );
      return formatDistance(distance);
    }

    // Fallback: Mock coordinates for common Tunisia cities
    const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
      tunis: { lat: 36.8065, lng: 10.1815 },
      ariana: { lat: 36.8625, lng: 10.1956 },
      sfax: { lat: 34.7406, lng: 10.7603 },
      sousse: { lat: 35.8256, lng: 10.6369 },
    };

    // Try to match city from location string
    const locationLower = event.location.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (locationLower.includes(city)) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          coords.lat,
          coords.lng
        );
        return formatDistance(distance);
      }
    }

    return null;
  }, [currentLocation, event.location, event.latitude, event.longitude]);

  const handleLocationPress = () => {
    if (event.location && event.location !== 'N/A') {
      // Use coordinates if available for more accurate navigation
      const coords =
        event.latitude && event.longitude
          ? { latitude: event.latitude, longitude: event.longitude }
          : undefined;
      openInMaps(event.location, coords);
    }
  };

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
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3">
                <MaterialCommunityIcons
                  name={getEventIcon(event) as any}
                  size={24}
                  color="#F05C0C"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-medium text-gray-900">
                  {event.title}
                </Text>
                <Text className="text-md text-gray-500 capitalize mt-0.5">
                  {event.type?.replace('_', ' ')}
                </Text>
              </View>
            </View>
            {showChevron && (
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
              {event.time ? formatEventTime(event.time) : 'TBD'}
            </Text>
          </View>

          {/* Doctor */}
          {event.doctor_name && (
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons
                name="stethoscope"
                size={16}
                color="#6B7280"
              />
              <Text className="text-md text-gray-700 ml-2">
                Dr. {event.doctor_name}
                {event.specialty && ` • ${event.specialty}`}
              </Text>
            </View>
          )}

          {/* Location */}
          {event.location && event.location !== 'N/A' && (
            <TouchableOpacity
              className="flex-row items-center mb-2"
              onPress={handleLocationPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color="#F05C0C"
              />
              <Text className="text-md text-orange-600 ml-2 flex-1">
                {event.location}
              </Text>
              {distanceText && (
                <Text className="text-md text-gray-500 font-medium ml-2">
                  {distanceText}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Details */}
          {event.details && event.details !== 'No details provided' && (
            <View className="mt-2 p-3 bg-gray-50 rounded-lg">
              <Text className="text-md text-gray-600">{event.details}</Text>
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

EventCard.displayName = 'EventCard';
