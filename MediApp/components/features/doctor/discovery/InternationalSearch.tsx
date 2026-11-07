// InternationalSearch.tsx

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Specialty {
  id: number;
  name: string;
}

interface Country {
  id: number;
  name: string;
}

interface InternationalSearchProps {
  countries: Country[];
  countriesLoading: boolean;
  specialties: Specialty[];
  specialtiesLoading: boolean;
  selectedCountry: Country | null;
  selectedSpecialty: Specialty | null;
  doctorName: string;
  onCountrySelect: (country: Country | null) => void;
  onSpecialtySelect: (specialty: Specialty | null) => void;
  onDoctorNameChange: (name: string) => void;
  onSearch: () => void;
  disabled?: boolean;
}

const InternationalSearch: React.FC<InternationalSearchProps> = ({
  countries,
  countriesLoading,
  specialties,
  specialtiesLoading,
  selectedCountry,
  selectedSpecialty,
  doctorName,
  onCountrySelect,
  onSpecialtySelect,
  onDoctorNameChange,
  onSearch,
  disabled = false,
}) => {
  // Determine if button should be enabled: specialty + name are required
  const hasInternationalSearchInput = useMemo(() => {
    return (
      !!selectedSpecialty && doctorName.trim().length > 0 && !!selectedCountry
    );
  }, [selectedSpecialty, doctorName, selectedCountry]);

  const buttonDisabled = disabled || !hasInternationalSearchInput;

  return (
    <View className="px-4 mb-6">
      <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <Text className="text-base font-medium text-gray-700 mb-4">
          International Search
        </Text>

        {/* Country Selector */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Select Country (Required)
          </Text>
          {countriesLoading ? (
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="earth" size={20} color="#6B7280" />
              <Text className="text-gray-500 ml-2">Loading countries...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {countries.map(country => (
                  <TouchableOpacity
                    key={country.id}
                    onPress={() => onCountrySelect(country)}
                    className={`mr-3 px-4 py-2 rounded-full border ${
                      selectedCountry?.id === country.id
                        ? 'bg-blue-100 border-blue-400'
                        : 'bg-white border-gray-200'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`text-sm ${
                        selectedCountry?.id === country.id
                          ? 'text-blue-800 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {country.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Specialty Selector */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Specialty (Required)
          </Text>
          {specialtiesLoading ? (
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="medical-bag"
                size={20}
                color="#6B7280"
              />
              <Text className="text-gray-500 ml-2">Loading specialties...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {specialties.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => onSpecialtySelect(s)}
                    className={`mr-3 px-4 py-2 rounded-full border ${
                      selectedSpecialty?.id === s.id
                        ? 'bg-green-100 border-green-400'
                        : 'bg-white border-gray-200'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`text-sm ${
                        selectedSpecialty?.id === s.id
                          ? 'text-green-800 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Doctor Name Input */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Doctor Name (Required)
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              backgroundColor: 'white',
            }}
          >
            <TextInput
              value={doctorName}
              onChangeText={onDoctorNameChange}
              placeholder="Enter doctor's name..."
              editable={!disabled}
              className={`flex-1 text-base px-4 ${Platform.OS === 'ios' ? 'h-12' : ''}`}
              placeholderTextColor="#9CA3AF"
              style={{ fontSize: 16 }}
              accessibilityLabel="International doctor name"
              accessible
            />
          </View>
        </View>

        {/* Search Button */}
        <View className="mt-4">
          <TouchableOpacity
            onPress={hasInternationalSearchInput ? onSearch : undefined}
            disabled={buttonDisabled}
            className={`rounded-lg py-4 px-6 flex-row items-center justify-center ${
              buttonDisabled ? 'bg-gray-300' : 'bg-[#F05C0C]'
            }`}
            activeOpacity={0.8}
            accessibilityState={{ disabled: buttonDisabled }}
            accessibilityLabel="Search International Doctors"
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white font-semibold text-base">
              Search Doctors
            </Text>
          </TouchableOpacity>

          {buttonDisabled && !disabled && (
            <Text className="text-xs text-gray-500 mt-2">
              Please select country, specialty, and enter doctor's name to
              enable search.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default InternationalSearch;
