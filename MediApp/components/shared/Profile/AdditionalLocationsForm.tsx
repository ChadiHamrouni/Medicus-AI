import { FormFieldWrapper, StandardBottomButton } from '@/components/shared/ui';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDoctorProfile } from '@/hooks/doctor';
import { useCountriesQuery } from '@/hooks/doctor/queries';
import { DoctorLocation, Location } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';

export const AdditionalLocationsForm: React.FC = () => {
  // Use cached profile data from login instead of separate API call
  const { authState } = useAuthContext();
  const profile = authState.doctorProfile;
  // Keep mutation operations for updates
  const { updateLocations, isUpdatingLocations, locationsError } =
    useDoctorProfile();
  useCountriesQuery();

  const [locations, setLocations] = useState<Location[]>([
    {
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      zip_code: '',
      is_primary: true,
      location_name: 'Primary Office',
    },
  ]);

  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [formData, setFormData] = useState<Location>(locations[0]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<Location[]>([]);

  // Auto-fill locations from profile data
  useEffect(() => {
    if (profile?.other_locations && profile.other_locations.length > 0) {
      // Convert DoctorLocation[] to Location[] (they have the same structure)
      const profileLocations: Location[] = (profile.other_locations || []).map(
        loc => ({
          address_line_1: loc.address_line_1,
          address_line_2: loc.address_line_2 || '',
          city: loc.city,
          state: loc.state,
          zip_code: loc.zip_code,
          country_id: loc.country_id,
          country_name: loc.country_name,
          is_primary: loc.is_primary,
          location_name: loc.location_name,
          latitude: loc.latitude,
          longitude: loc.longitude,
        })
      );

      // Ensure at least one location is marked as primary
      const hasAnyPrimary = profileLocations.some(loc => loc.is_primary);
      if (!hasAnyPrimary && profileLocations.length > 0) {
        profileLocations[0].is_primary = true;
      }

      setLocations(profileLocations);
      setFormData(profileLocations[0]);
      setInitialData(JSON.parse(JSON.stringify(profileLocations))); // Deep copy for comparison
    }
  }, [profile?.other_locations]);

  // Track changes
  useEffect(() => {
    const hasDataChanged =
      JSON.stringify(locations) !== JSON.stringify(initialData);
    setHasChanges(hasDataChanged);
  }, [locations, initialData]);

  const formFields = [
    'location_name',
    'address_line_1',
    'address_line_2',
    'city',
    'state',
    'zip_code',
  ];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields);

  const handleInputChange = (
    field: keyof Location,
    value: string | boolean | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setLocations(prev => {
      const newLocations = [...prev];
      newLocations[selectedLocationIndex] = {
        ...newLocations[selectedLocationIndex],
        [field]: value,
      };
      return newLocations;
    });
  };

  const addNewLocation = () => {
    const newLocationIndex = locations.length + 1;
    setLocations(prev => [
      ...prev,
      {
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: '',
        is_primary: false,
        location_name: `Location ${newLocationIndex}`,
      },
    ]);
    setSelectedLocationIndex(locations.length);
    setFormData({
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      zip_code: '',
      is_primary: false,
      location_name: `Location ${newLocationIndex}`,
    });
  };

  const removeLocation = (index: number) => {
    if (locations.length > 1) {
      const newLocations = locations.filter((_, i) => i !== index);
      setLocations(newLocations);

      // If we removed the selected location, select the first one
      if (selectedLocationIndex === index) {
        setSelectedLocationIndex(0);
        setFormData(newLocations[0]);
      } else if (selectedLocationIndex > index) {
        // Adjust selected index if we removed a location before it
        const newIndex = selectedLocationIndex - 1;
        setSelectedLocationIndex(newIndex);
        setFormData(newLocations[newIndex]);
      }
    }
  };

  const handleUpdate = async () => {
    try {
      // Validate that all locations have required fields
      const invalidLocations = locations.filter(
        location =>
          !location.address_line_1 ||
          !location.city ||
          !location.state ||
          !location.zip_code
      );

      if (invalidLocations.length > 0) {
        Alert.alert(
          'Incomplete Information',
          'Please fill in all required fields (address, city, state, zip code) for all locations.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Ensure at least one location is marked as primary
      const hasAnyPrimary = locations.some(location => location.is_primary);

      let locationsToUpdate: Location[];
      if (!hasAnyPrimary) {
        // If no location is marked as primary, set the first one as primary
        locationsToUpdate = locations.map((location, index) => ({
          ...location,
          is_primary: index === 0,
        }));

        // Update local state to reflect this change
        setLocations(locationsToUpdate);
        if (selectedLocationIndex === 0) {
          setFormData(prev => ({ ...prev, is_primary: true }));
        }

        Alert.alert(
          'Primary Location Set',
          'The first location has been automatically set as primary.',
          [{ text: 'OK' }]
        );
      } else {
        locationsToUpdate = locations;
      }

      const doctorLocations: DoctorLocation[] = locationsToUpdate.map(
        location => ({
          address_line_1: location.address_line_1,
          address_line_2: location.address_line_2,
          city: location.city,
          state: location.state,
          zip_code: location.zip_code,
          country_id: location.country_id,
          country_name: location.country_name,
          is_primary: location.is_primary,
          location_name: location.location_name,
          latitude: location.latitude,
          longitude: location.longitude,
        })
      );

      await updateLocations(doctorLocations);

      // Update initial data to reflect saved state
      setInitialData(JSON.parse(JSON.stringify(locationsToUpdate)));

      Alert.alert('Success', 'Locations updated successfully!', [
        { text: 'OK' },
      ]);
    } catch {
      Alert.alert(
        'Error',
        locationsError?.message ||
          'Failed to update locations. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-6">
        {/* Header Section */}

        {/* Location Tabs */}
        <View className="mb-6">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Your Locations ({locations.length})
          </Text>
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <View className="flex-row flex-wrap">
              {locations.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedLocationIndex(index);
                    setFormData(locations[index]);
                  }}
                  className={`flex-row items-center mr-3 mb-3 px-4 py-2 rounded-full ${
                    selectedLocationIndex === index
                      ? 'bg-[#F05C0C]'
                      : 'bg-gray-100 border-2 border-gray-200 shadow-sm'
                  }`}
                >
                  <MaterialCommunityIcons
                    name={locations[index].is_primary ? 'star' : 'map-marker'}
                    size={18}
                    color={
                      selectedLocationIndex === index
                        ? 'white'
                        : locations[index].is_primary
                          ? '#F05C0C'
                          : '#6B7280'
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`font-medium ${
                      selectedLocationIndex === index
                        ? 'text-white'
                        : locations[index].is_primary
                          ? 'text-[#F05C0C]'
                          : 'text-gray-700'
                    }`}
                  >
                    {locations[index].location_name || `Location ${index + 1}`}
                  </Text>
                  {locations.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeLocation(index)}
                      className="ml-2 p-1"
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={16}
                        color={
                          selectedLocationIndex === index ? 'white' : '#EF4444'
                        }
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={addNewLocation}
              className="flex-row items-center justify-center mt-3 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={20}
                color="#F05C0C"
              />
              <Text className="ml-2 text-[#F05C0C] font-medium">
                Add New Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Details Form */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="form-textbox"
                size={22}
                color="white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                {formData.location_name ||
                  `Location ${selectedLocationIndex + 1}`}{' '}
                Details
              </Text>
              <Text className="text-sm text-gray-600">
                Fill in the address information below
              </Text>
            </View>
          </View>

          {formFields.map(field => (
            <View key={field} className="mb-4">
              <FormFieldWrapper
                type="text"
                field={field}
                value={String(formData[field as keyof Location] || '')}
                label={
                  field === 'location_name'
                    ? 'Location Name'
                    : field === 'address_line_1'
                      ? 'Street Address'
                      : field === 'address_line_2'
                        ? 'Apartment, Suite, etc. (Optional)'
                        : field === 'city'
                          ? 'City'
                          : field === 'state'
                            ? 'State/Region'
                            : field === 'zip_code'
                              ? 'Postal Code'
                              : field
                                  .split(/(?=[A-Z])/)
                                  .join(' ')
                                  .charAt(0)
                                  .toUpperCase() +
                                field
                                  .split(/(?=[A-Z])/)
                                  .join(' ')
                                  .slice(1)
                }
                isActive={selectedInput === field}
                borderColor={getBorderColor(field)}
                labelStyle={getLabelStyle(field)}
                onFocus={() => handleFocus(field)}
                onBlur={() => handleBlur(field)}
                onChangeText={text =>
                  handleInputChange(field as keyof Location, text)
                }
                keyboardType={field === 'zip_code' ? 'numeric' : 'default'}
                placeholder={
                  field === 'location_name'
                    ? 'e.g., Main Office, Downtown Clinic'
                    : field === 'address_line_1'
                      ? '123 Main Street'
                      : field === 'address_line_2'
                        ? 'Suite 200 (Optional)'
                        : field === 'city'
                          ? 'Enter city name'
                          : field === 'state'
                            ? 'Enter state or region'
                            : field === 'zip_code'
                              ? '12345'
                              : ''
                }
              />
            </View>
          ))}

          {/* Country Display (from doctors_view) */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Country
            </Text>
            <View className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="earth"
                  size={20}
                  color="#6B7280"
                />
                <Text className="text-base text-gray-900 ml-2 font-medium">
                  {profile?.country_name ||
                    formData.country_name ||
                    'Not specified'}
                </Text>
              </View>
              <Text className="text-sm text-gray-500 mt-1">
                Country information is managed from your main profile settings
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Location Setting */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-[#F05C0C] rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons
                name="star-outline"
                size={22}
                color="white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                Primary Location Setting
              </Text>
              <Text className="text-sm text-gray-600">
                Set this as your main practice location
              </Text>
            </View>
          </View>

          <View
            className={`p-4 rounded-lg border-2 ${
              formData.is_primary
                ? 'bg-orange-50 border-orange-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className={`font-medium ${
                    formData.is_primary ? 'text-[#F05C0C]' : 'text-gray-700'
                  }`}
                >
                  {formData.is_primary
                    ? 'Primary Location'
                    : 'Secondary Location'}
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  {formData.is_primary
                    ? 'This is your main practice location'
                    : 'Tap the switch to make this your primary location'}
                </Text>
              </View>
              <Switch
                value={formData.is_primary}
                onValueChange={value => {
                  if (value) {
                    const updatedLocations = locations.map((loc, index) => ({
                      ...loc,
                      is_primary: index === selectedLocationIndex,
                    }));
                    setLocations(updatedLocations);
                    setFormData(prev => ({ ...prev, is_primary: true }));
                  } else {
                    const otherPrimaryExists = locations.some(
                      (loc, index) =>
                        index !== selectedLocationIndex && loc.is_primary
                    );

                    if (locations.length === 1 || !otherPrimaryExists) {
                      Alert.alert(
                        'Cannot Remove Primary',
                        'At least one location must be set as primary.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }

                    const updatedLocations = locations.map((loc, index) => ({
                      ...loc,
                      is_primary:
                        index === selectedLocationIndex
                          ? false
                          : loc.is_primary,
                    }));
                    setLocations(updatedLocations);
                    setFormData(prev => ({ ...prev, is_primary: false }));
                  }
                }}
                trackColor={{ false: '#D1D5DB', true: '#F05C0C' }}
                thumbColor={formData.is_primary ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Summary Card - Before Button */}
        <View className="bg-green-50 rounded-xl border border-green-200 p-4 mb-4 mx-4">
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color="#10B981"
            />
            <Text className="text-base font-semibold text-green-900 ml-2">
              {locations.length} Location{locations.length === 1 ? '' : 's'}{' '}
              Configured
            </Text>
          </View>
          <Text className="text-sm text-green-700">
            Patients will be able to find and book appointments at{' '}
            {locations.length === 1
              ? 'this location'
              : 'any of these locations'}
          </Text>
        </View>

        {/* Bottom Spacing */}
        <View />
      </View>

      <View className="p-4 border-t border-gray-200 bg-white">
        <StandardBottomButton
          onPress={handleUpdate}
          label={
            isUpdatingLocations
              ? 'Saving...'
              : hasChanges
                ? `Save ${locations.length} Location${locations.length === 1 ? '' : 's'}`
                : 'No Changes to Save'
          }
          isLoading={isUpdatingLocations}
          isDisabled={!hasChanges || isUpdatingLocations}
        />
      </View>
    </View>
  );
};
