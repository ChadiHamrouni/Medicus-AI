import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { logger } from './infrastructure';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceInKm: number): string {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m away`;
  } else if (distanceInKm < 10) {
    return `${distanceInKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceInKm)}km away`;
  }
}

/**
 * Get current location with permission handling
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    // Check if location services are enabled
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      return null;
    }

    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return location;
  } catch (error) {
    logger.error('Error getting current location:', error as any);
    return null;
  }
}

/**
 * Open address in native Maps app
 */
export function openInMaps(
  address: string,
  coordinates?: { latitude: number; longitude: number }
) {
  let url: string;

  if (coordinates) {
    // If we have coordinates, use them for more accurate navigation
    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${coordinates.latitude},${coordinates.longitude}`;
    } else {
      url = `geo:0,0?q=${coordinates.latitude},${coordinates.longitude}(${encodeURIComponent(address)})`;
    }
  } else {
    // Fallback to address-based navigation
    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${encodeURIComponent(address)}`;
    } else {
      url = `geo:0,0?q=${encodeURIComponent(address)}`;
    }
  }

  Linking.canOpenURL(url)
    .then(supported => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        const webUrl = coordinates
          ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        return Linking.openURL(webUrl);
      }
    })
    .catch(err => logger.error('Error opening maps:', err));
}

/**
 * Parse address string to extract coordinates if embedded
 * Some addresses might have coordinates embedded like: "Address (lat,lng)"
 */
export function parseCoordinatesFromAddress(
  address: string
): { latitude: number; longitude: number } | null {
  // Try to extract coordinates from patterns like: "Address (36.8065, 10.1815)"
  const coordPattern = /\(?\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\)?/;
  const match = address.match(coordPattern);

  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    // Validate coordinates (rough check for Tunisia region)
    if (lat >= 30 && lat <= 38 && lng >= 7 && lng <= 12) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

/**
 * Geocode address to coordinates (requires backend support or Google Maps API)
 * This is a placeholder - you'll need to implement backend geocoding
 */
export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  // TODO: Implement geocoding via your backend or Google Maps API
  // For now, return null - coordinates should come from backend
  return null;
}

/**
 * Get country code from GPS location using reverse geocoding
 * Returns country code (e.g., 'US', 'GB', 'TN')
 */
export async function getCountryFromLocation(): Promise<string> {
  try {
    const enabled = await Location.hasServicesEnabledAsync();

    if (!enabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services in your device settings to auto-detect your country.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return 'US';
    }

    const { status: currentStatus } =
      await Location.getForegroundPermissionsAsync();

    let finalStatus = currentStatus;

    if (currentStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'We need location access to auto-detect your country for phone number formatting. You can change this in settings.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return 'US';
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    const geocodeResult = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (geocodeResult && geocodeResult.length > 0) {
      const geocode = geocodeResult[0];
      if (geocode?.isoCountryCode) {
        return geocode.isoCountryCode;
      }
    }

    return 'US';
  } catch (error) {
    logger.error('getCountryFromLocation: Error:', error as any);
    return 'US';
  }
}
