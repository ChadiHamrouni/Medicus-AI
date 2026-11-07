import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '@/components/shared';

interface Specialty {
  id: number;
  name: string;
}

interface SearchBoxProps {
  specialties: Specialty[];
  specialtiesLoading: boolean;
  selectedSpecialty: Specialty | null;
  doctorName: string;
  // eslint-disable-next-line no-unused-vars
  onSpecialtySelect: (specialty: Specialty | null) => void;
  // eslint-disable-next-line no-unused-vars
  onDoctorNameChange: (name: string) => void;
  onSearch: () => void;
  disabled?: boolean; // external disabling (e.g. searching)
  userCountryName?: string; // Country name to show in placeholder
}

/**
 * SearchBox:
 * - Local search UI (specialty selector + doctor name + explicit Search button)
 * - Button is enabled when either specialty is selected OR doctorName has content.
 * - Shows a small helper text when button is disabled because both inputs are empty.
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  specialties,
  specialtiesLoading,
  selectedSpecialty,
  doctorName,
  onSpecialtySelect,
  onDoctorNameChange,
  onSearch,
  disabled = false,
  userCountryName,
}) => {
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [specialtySearchText, setSpecialtySearchText] = useState('');
  const [filteredSpecialties, setFilteredSpecialties] = useState<Specialty[]>(
    []
  );

  // Filter specialties based on search text
  useEffect(() => {
    if (specialtySearchText.trim()) {
      const filtered = specialties.filter(specialty =>
        specialty.name.toLowerCase().includes(specialtySearchText.toLowerCase())
      );
      setFilteredSpecialties(filtered);
    } else {
      setFilteredSpecialties(specialties);
    }
  }, [specialties, specialtySearchText]);

  const handleSpecialtySelect = (specialty: Specialty) => {
    onSpecialtySelect(specialty);
    setShowSpecialtyDropdown(false);
    setSpecialtySearchText('');
  };

  const clearSpecialty = () => {
    onSpecialtySelect(null);
    setSpecialtySearchText('');
  };

  // Determine whether Search button should be enabled
  // Local search rules (you specified): valid if either specialty selected OR doctor name provided.
  const hasLocalSearchInput = useMemo(() => {
    return !!selectedSpecialty || (doctorName && doctorName.trim().length > 0);
  }, [selectedSpecialty, doctorName]);

  const buttonDisabled = disabled || !hasLocalSearchInput;

  return (
    <View className="px-4 border-t border-gray-200 rounded-xl">
      <View className="p-4">
        {/* <Text className="text-base font-medium text-gray-700 mb-4">
          {userCountryName
            ? `Search Doctors in ${userCountryName}`
            : 'Search Doctors'}
        </Text> */}

        <View className="space-y-6">
          <View
            className="mb-4"
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              backgroundColor: 'white',
            }}
          >
            <TouchableOpacity
              onPress={() => !disabled && setShowSpecialtyDropdown(true)}
              disabled={disabled}
              className="flex-row items-center justify-between px-4 h-12"
            >
              <Text
                className={`flex-1 text-base ${selectedSpecialty ? 'text-gray-900' : 'text-gray-400'}`}
              >
                {selectedSpecialty
                  ? selectedSpecialty.name
                  : 'Select specialty...'}
              </Text>
              <View className="flex-row items-center">
                {selectedSpecialty && (
                  <TouchableOpacity
                    onPress={clearSpecialty}
                    disabled={disabled}
                    className="p-1 mr-2"
                    accessibilityLabel="Clear selected specialty"
                    accessible
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color="#F05C0C"
                    />
                  </TouchableOpacity>
                )}
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color="#6B7280"
                  accessibilityLabel="Open specialties"
                />
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              backgroundColor: 'white',
            }}
          >
            <View className="flex-row items-center">
              <TextInput
                value={doctorName}
                onChangeText={onDoctorNameChange}
                placeholder="Enter doctor's name..."
                editable={!disabled}
                className={`flex-1 text-base px-4 ${Platform.OS === 'ios' ? 'h-12' : ''}`}
                placeholderTextColor="#9CA3AF"
                style={{ fontSize: 16 }}
                accessibilityLabel="Doctor name"
                accessible
              />
            </View>
          </View>

          {/* Search Button */}
          <View className="mt-4">
            <Button
              onPress={onSearch}
              title={
                userCountryName
                  ? `Search in ${userCountryName}`
                  : 'Search Doctors'
              }
              disabled={buttonDisabled}
              containerClassName={`rounded-lg py-4 px-6 flex-row items-center justify-center ${
                buttonDisabled ? 'bg-gray-300' : 'bg-[#F05C0C]'
              }`}
              textClassName="text-white font-semibold text-base"
              iconPosition="left"
            >
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
            </Button>

            {/* Helper hint when button disabled due to no input */}
            {/* {buttonDisabled && !disabled && !hasLocalSearchInput && (
              <Text className="text-xs text-gray-500 mt-2">
                Select a specialty or enter a doctor&apos;s name to enable
                search.
              </Text>
            )} */}
          </View>
        </View>
      </View>

      {/* Specialty Dropdown Modal */}
      <Modal
        visible={showSpecialtyDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpecialtyDropdown(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center px-4"
          activeOpacity={1}
          onPress={() => setShowSpecialtyDropdown(false)}
        >
          <TouchableOpacity
            className="bg-white rounded-xl max-h-96"
            activeOpacity={1}
          >
            <View className="p-4 border-b border-gray-200">
              {/* <Text className="text-lg font-semibold text-gray-900 mb-4">
                Select Specialty
              </Text> */}
              <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <TextInput
                  value={specialtySearchText}
                  onChangeText={setSpecialtySearchText}
                  placeholder="Search specialties..."
                  className="text-base"
                  placeholderTextColor="#9CA3AF"
                  style={{ fontSize: 16 }}
                  accessibilityLabel="Filter specialties"
                />
              </View>
            </View>

            {specialtiesLoading ? (
              <View className="p-8 items-center">
                <Text className="text-gray-500">Loading specialties...</Text>
              </View>
            ) : filteredSpecialties.length === 0 ? (
              <View className="p-8 items-center">
                <Text className="text-gray-500">No specialties found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredSpecialties}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSpecialtySelect(item)}
                    className="p-4"
                  >
                    <Text className="text-gray-900 text-base">{item.name}</Text>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 300 }}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SearchBox;
