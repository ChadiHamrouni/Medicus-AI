import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapSearchBar } from './MapSearchBar';
import { QuickLocations } from './QuickLocations';
import { SelectedAddressPreview } from './SelectedAddressPreview';
import { MapControls } from './MapControls';
import { PracticeInformationFormFieldKey as FormFieldKey } from '@/types';

export type SelectedAddressType = {
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
};

type LocationMapModalProps = {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (_address: SelectedAddressType) => void;
  activeLocationField: FormFieldKey | null;
};

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  visible,
  onClose,
  onLocationSelected,
  activeLocationField: _activeLocationField,
}) => {
  // Map related state
  const [, setRegion] = useState({
    latitude: 36.8065, // Default to Tunisia
    longitude: 10.1815,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [markerPosition, setMarkerPosition] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: 36.8065, // Default to Tunisia
    longitude: 10.1815,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAddress, setSelectedAddress] =
    useState<SelectedAddressType | null>(null);

  // Reference to the map component
  // const mapRef = useRef<MapView>(null);

  // Initialize the address when the component mounts
  useEffect(() => {
    if (visible) {
      // Get address details for the initial marker position
      reverseGeocode(markerPosition.latitude, markerPosition.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Request location permissions and get current location
  const requestLocationPermission = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use the map features.'
        );
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Update region and marker position
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      setMarkerPosition({ latitude, longitude });

      // Reverse geocode to get address details
      await reverseGeocode(latitude, longitude);
    } catch {
      // console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse geocode coordinates to get address
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results && results.length > 0) {
        const result = results[0];

        // Create a new address object with all fields converted to Latin characters
        setSelectedAddress({
          address: result.street || '',
          addressLine2: result.district || '',
          city: result.city || '',
          state: result.region || '',
          zipCode: result.postalCode || '',
          latitude,
          longitude,
        });
      }
    } catch {
      // console.error('Error reverse geocoding:', error);
    }
  };

  // Search for addresses
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      // Convert search query to Latin characters before searching
      const latinSearchQuery = searchQuery;
      const results = await Location.geocodeAsync(latinSearchQuery);

      if (results && results.length > 0) {
        // Get the first result
        const { latitude, longitude } = results[0];

        // Update marker position
        setMarkerPosition({ latitude, longitude });

        // Update region to center on the search result
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setRegion(newRegion);
        // mapRef.current?.animateToRegion(newRegion, 1000);

        // Get address details
        await reverseGeocode(latitude, longitude);
      } else {
        Alert.alert('No Results', 'No locations found for your search.');
      }
    } catch {
      // console.error('Error searching address:', error);
      Alert.alert('Error', 'Failed to search for the address.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle map press to select location
  // const handleMapPress = async (event: any) => {
  //   const { coordinate } = event.nativeEvent;
  //   setMarkerPosition(coordinate);
  //   await reverseGeocode(coordinate.latitude, coordinate.longitude);
  // };

  // Handle location selection
  const handleLocationSelected = () => {
    if (!selectedAddress) {
      Alert.alert(
        'No Location Selected',
        'Please select a location on the map first.'
      );
      return;
    }

    onLocationSelected(selectedAddress);
    onClose();
  };

  // Handle quick location selection
  const handleQuickLocationSelect = async (locationName: string) => {
    setIsLoading(true);
    try {
      // Convert location name to Latin characters
      const latinLocationName = locationName;
      const results = await Location.geocodeAsync(
        `${latinLocationName}, Tunisia`
      );
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        setMarkerPosition({ latitude, longitude });

        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setRegion(newRegion);
        // mapRef.current?.animateToRegion(newRegion, 1000);

        await reverseGeocode(latitude, longitude);
      }
    } catch {
      // console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 mb-4">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white rounded-t-lg mx-0 mb-0">
          {/* Header */}
          <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-lg font-bold">Select Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <MapSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={searchAddress}
          />

          {/* Map View */}
          <View className="h-[300px] w-full">
            {/* Draggable marker hint */}
            <View className="absolute top-2 left-2 right-2 z-10 bg-white/80 p-2 rounded-md">
              <Text className="text-xs text-center text-gray-700">
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#F05C0C"
                />{' '}
                Tap on the map to place marker or drag the red marker to adjust
                location
              </Text>
            </View>
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#f0f0f0',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#666' }}>Map temporarily disabled</Text>
            </View>
            {/* <MapView
              ref={mapRef}
              style={{ width: '100%', height: '100%' }}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
              region={region}
              onRegionChangeComplete={setRegion}
              onPress={handleMapPress}
              showsUserLocation
              mapType="standard"
              zoomEnabled={true}
              zoomControlEnabled={true}
              rotateEnabled={true}
              scrollEnabled={true}
            >
              {markerPosition && (
                <Marker
                  coordinate={markerPosition}
                  pinColor="#FF0000"
                  draggable
                  tracksViewChanges={false}
                  onDragEnd={(e) => {
                    setMarkerPosition(e.nativeEvent.coordinate);
                    reverseGeocode(
                      e.nativeEvent.coordinate.latitude,
                      e.nativeEvent.coordinate.longitude
                    );
                  }}
                >
                  <View style={{ 
                    backgroundColor: '#FF0000', 
                    padding: 5,
                    borderRadius: 15,
                    borderWidth: 2,
                    borderColor: 'white',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.8,
                    shadowRadius: 2,
                    elevation: 5,
                  }}>
                    <Ionicons name="location" size={20} color="white" />
                  </View>
                  <Callout tooltip>
                    <View style={{
                      backgroundColor: 'white',
                      padding: 10,
                      borderRadius: 6,
                      borderColor: '#ccc',
                      borderWidth: 1,
                      width: 150,
                    }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Selected Location</Text>
                      <Text style={{ fontSize: 12 }}>Drag to adjust position</Text>
                    </View>
                  </Callout>
                </Marker>
              )}
            </MapView> */}

            {/* Map Controls */}
            <MapControls onLocatePress={requestLocationPermission} />
          </View>

          {/* Quick Location Options */}
          <QuickLocations onLocationSelect={handleQuickLocationSelect} />

          {/* Selected Address Preview */}
          {selectedAddress && (
            <SelectedAddressPreview address={selectedAddress} />
          )}

          {/* Action Buttons */}
          <View className="p-3 border-t border-gray-200 flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-gray-200 py-4 px-4 rounded"
              onPress={onClose}
            >
              <Text className="text-gray-700 text-center">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-[#F05C0C] py-4 px-4 rounded"
              onPress={handleLocationSelected}
              disabled={!selectedAddress}
            >
              <Text className="text-white text-center">Use This Location</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/30 items-center justify-center">
              <View className="bg-white p-4 rounded-lg">
                <ActivityIndicator size="large" color="#F05C0C" />
                <Text className="mt-2 text-center">Loading...</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
