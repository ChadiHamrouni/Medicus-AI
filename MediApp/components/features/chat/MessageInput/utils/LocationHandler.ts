import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: number;
}

/**
 * Helper function to get address from coordinates using reverse geocoding
 */
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string | undefined> => {
  try {
    const geocode = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (geocode && geocode.length > 0) {
      const addressInfo = geocode[0];
      const address = [
        addressInfo.name,
        addressInfo.street,
        addressInfo.city,
        addressInfo.region,
        addressInfo.country,
      ]
        .filter(Boolean)
        .join(', ');

      return address || undefined;
    }
  } catch (error) {
    console.error('Error getting address:', error);
  }

  return undefined;
};

export const useLocationHandler = (
  onLocationSelect: ((location: any) => void) | undefined
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null
  );

  const handleLocationPress = async () => {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'We need location permissions to share your current location. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Show loading state
      setIsLoading(true);

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });

      // Get address using the helper function
      const address = await getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
        timestamp: location.timestamp,
      };

      setCurrentLocation(locationData);
      setShowModal(true);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentLocation(null);
  };

  const handleShareLocation = (location: LocationData) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    setShowModal(false);
  };

  return {
    handleLocationPress,
    isLoading,
    showModal,
    currentLocation,
    handleCloseModal,
    handleShareLocation,
  };
};
