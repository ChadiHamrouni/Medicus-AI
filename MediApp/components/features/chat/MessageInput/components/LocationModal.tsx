import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
// import MapView, {
//   Marker,
//   PROVIDER_GOOGLE,
//   MapPressEvent,
// } from "react-native-maps";
// import { MarkerDragStartEndEvent } from "react-native-maps/lib/sharedTypes";
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  LocationData,
  getAddressFromCoordinates,
} from '../utils/LocationHandler';

interface LocationModalProps {
  visible: boolean;
  location: LocationData | null;
  onClose: () => void;
  onShare: (location: LocationData) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  location,
  onClose,
  onShare,
}) => {
  // const mapRef = useRef<MapView>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    location
  );
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [isCustomLocation, setIsCustomLocation] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<
    Location.LocationGeocodedAddress[]
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Reset selected location when the initial location changes
  useEffect(() => {
    if (location) {
      setSelectedLocation(location);
      setIsCustomLocation(false);
    }
  }, [location]);

  // Handle map press to select a new location
  // const handleMapPress = async (event: MapPressEvent) => {
  //   const { coordinate } = event.nativeEvent;
  //   updateSelectedLocation(coordinate.latitude, coordinate.longitude);
  // };

  // Handle marker drag end
  // const handleMarkerDragEnd = async (event: MarkerDragStartEndEvent) => {
  //   const { coordinate } = event.nativeEvent;
  //   setIsDragging(false);
  //   updateSelectedLocation(coordinate.latitude, coordinate.longitude);
  // };

  // Update the selected location with new coordinates
  const updateSelectedLocation = async (
    latitude: number,
    longitude: number
  ) => {
    setIsLoadingAddress(true);

    const newLocation: LocationData = {
      latitude,
      longitude,
      timestamp: Date.now(),
      address: undefined, // Will be populated after geocoding
    };

    // Get the address for the selected location using the shared helper function
    const address = await getAddressFromCoordinates(latitude, longitude);

    newLocation.address = address;
    setSelectedLocation(newLocation);
    setIsCustomLocation(true);
    setIsLoadingAddress(false);
  };

  // Reset to current location
  const handleResetLocation = () => {
    if (location) {
      setSelectedLocation(location);
      setIsCustomLocation(false);
      setSearchQuery('');
      setSearchResults([]);

      // mapRef.current?.animateToRegion(
      //   {
      //     latitude: location.latitude,
      //     longitude: location.longitude,
      //     latitudeDelta: 0.01,
      //     longitudeDelta: 0.01,
      //   },
      //   300
      // );
    }
  };

  // Handle search for locations
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const results = await Location.geocodeAsync(searchQuery);

      if (results.length > 0) {
        // Get detailed address information for each result
        const detailedResults = await Promise.all(
          results.slice(0, 5).map(async result => {
            const geocode = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude,
            });
            return geocode[0];
          })
        );

        setSearchResults(detailedResults.filter(Boolean));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching for location:', error);
      setSearchResults([]);
    }

    setIsSearching(false);
  };

  // Handle selection of a search result
  const handleSelectSearchResult = async (
    result: Location.LocationGeocodedAddress
  ) => {
    try {
      const locations = await Location.geocodeAsync(
        [result.name, result.street, result.city, result.region, result.country]
          .filter(Boolean)
          .join(', ')
      );

      if (locations.length > 0) {
        const { latitude, longitude } = locations[0];

        updateSelectedLocation(latitude, longitude);
        // mapRef.current?.animateToRegion(
        //   {
        //     latitude,
        //     longitude,
        //     latitudeDelta: 0.01,
        //     longitudeDelta: 0.01,
        //   },
        //   300
        // );

        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error getting coordinates for address:', error);
    }
  };

  if (!location) return null;

  return (
    location &&
    selectedLocation && (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="w-[90%] bg-white rounded-xl p-5 items-center shadow-lg">
            <Text className="text-lg font-bold mb-2">Share Location</Text>

            {/* Search bar */}
            <View className="w-full flex-row items-center mb-3 bg-gray-100 rounded-lg px-2">
              <Ionicons name="search" size={18} color="#6B7280" />
              <TextInput
                className="flex-1 py-2 px-2 text-base"
                placeholder="Search for a location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search results */}
            {isSearching ? (
              <View className="w-full h-16 justify-center items-center">
                <ActivityIndicator size="small" color="#F05C0C" />
              </View>
            ) : searchResults.length > 0 ? (
              <ScrollView
                className="w-full max-h-32 mb-2 bg-white rounded-lg border border-gray-200"
                keyboardShouldPersistTaps="handled"
              >
                {searchResults.map((result, index) => {
                  const addressText = [
                    result.name,
                    result.street,
                    result.city,
                    result.region,
                    result.country,
                  ]
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <TouchableOpacity
                      key={index}
                      className={`p-2 ${
                        index < searchResults.length - 1
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                      onPress={() => handleSelectSearchResult(result)}
                    >
                      <Text className="text-sm">{addressText}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            <View className="flex-row items-center justify-center mb-2">
              <Text className="text-xs text-gray-500 text-center">
                {isDragging
                  ? 'Release to select this location'
                  : 'Tap or drag the pin to select a location'}
              </Text>

              {isCustomLocation && (
                <TouchableOpacity
                  className="ml-2 flex-row items-center"
                  onPress={handleResetLocation}
                >
                  <Text className="text-xs text-orange-600 font-medium">
                    Reset
                  </Text>
                  <Ionicons name="refresh" size={14} color="#F05C0C" />
                </TouchableOpacity>
              )}
            </View>

            {isLoadingAddress ? (
              <View className="h-8 mb-4 justify-center items-center">
                <ActivityIndicator size="small" color="#F05C0C" />
              </View>
            ) : (
              selectedLocation && (
                <View className="mb-4 items-center">
                  {isCustomLocation && (
                    <Text className="text-xs text-orange-600 mb-1">
                      Custom location selected
                    </Text>
                  )}
                  {selectedLocation.address && (
                    <Text className="text-sm text-gray-600 text-center">
                      {selectedLocation.address}
                    </Text>
                  )}
                  <View className="flex-row justify-between w-full mt-2">
                    <Text className="text-xs text-gray-600">
                      Lat: {selectedLocation.latitude.toFixed(6)}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Long: {selectedLocation.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
              )
            )}

            <View className="w-full h-52 rounded-lg overflow-hidden mb-5 bg-gray-200 items-center justify-center">
              <Text className="text-gray-500">Map temporarily disabled</Text>
              {/* <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={handleMapPress}
              >
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  pinColor="#F05C0C"
                  draggable
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleMarkerDragEnd}
                />
              </MapView> */}
            </View>

            <View className="flex-row justify-between w-full">
              <TouchableOpacity
                className="bg-gray-200 py-3 px-4 rounded-lg flex-1 mr-2 items-center"
                onPress={onClose}
              >
                <Text className="text-base font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-orange-600 py-3 px-4 rounded-lg flex-1 ml-2 items-center"
                onPress={() => onShare(selectedLocation)}
                disabled={isLoadingAddress || isDragging}
              >
                <Text className="text-base font-medium text-white">
                  {isLoadingAddress ? 'Loading...' : 'Share Location'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  );
};
