import { Country } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

interface CountryDropdownProps {
  value: string;
  countries?: Country[];
  onValueChange?: (_value: string, _countryId: string) => void;
  label: string;
  isActive: boolean;
  borderColor: Animated.AnimatedInterpolation<string | number>;
  labelStyle: any;
  onFocus?: () => void;
  onBlur?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const CountryDropdown: React.FC<CountryDropdownProps> = ({
  value,
  countries = [],
  onValueChange,
  label,
  isActive,
  borderColor,
  labelStyle,
  onFocus,
  onBlur,
  isLoading = false,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter countries based on search query
  const filteredCountries = countries.filter(
    country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (country.short_name?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false) ||
      (country.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleCountrySelect = (country: Country) => {
    onValueChange?.(country.name, country.id.toString());
    setModalVisible(false);
    setSearchQuery('');
    onBlur?.();
  };

  const handleModalOpen = () => {
    if (isLoading || disabled) return;
    setModalVisible(true);
    onFocus?.();
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSearchQuery('');
    onBlur?.();
  };

  return (
    <View>
      <Animated.View
        style={{ borderColor: isActive ? borderColor : '#E5E7EB' }}
        className={`relative border rounded-lg ${
          isLoading || disabled ? 'opacity-50' : ''
        }`}
      >
        <Pressable
          onPress={handleModalOpen}
          disabled={isLoading || disabled}
          className="p-3"
        >
          <Animated.Text
            style={labelStyle}
            className={`absolute left-3 top-0 bg-white px-1 text-sm ${
              isActive ? 'text-[#F05C0C]' : 'text-gray-500'
            }`}
          >
            {label}
          </Animated.Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              {isLoading ? (
                <ActivityIndicator size="small" color="#F05C0C" />
              ) : (
                <Text className="text-base text-gray-900">
                  {disabled
                    ? value || 'Country (Read-only)'
                    : value || 'Select Country'}
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-down"
              size={20}
              color={isActive ? '#F05C0C' : '#9CA3AF'}
            />
          </View>
        </Pressable>
      </Animated.View>

      <Modal
        visible={modalVisible}
        animationType="fade"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="px-6 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">
                Select Country
              </Text>
              <Pressable
                onPress={handleModalClose}
                className="p-2 rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={20} color="#374151" />
              </Pressable>
            </View>
          </View>

          {/* Search */}
          <View className="px-6 py-3 border-b border-gray-100">
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-2 text-base text-gray-900"
                placeholder="Search countries..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Countries List */}
          <ScrollView className="flex-1">
            {isLoading ? (
              <View className="flex-1 items-center justify-center py-12">
                <ActivityIndicator size="large" color="#F05C0C" />
                <Text className="text-gray-500 mt-3">Loading countries...</Text>
              </View>
            ) : filteredCountries.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="earth-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3 text-center">
                  {searchQuery
                    ? 'No countries found'
                    : 'No countries available'}
                </Text>
              </View>
            ) : (
              filteredCountries.map(country => (
                <Pressable
                  key={country.id}
                  onPress={() => handleCountrySelect(country)}
                  className={`px-6 py-4 border-b border-gray-50 ${
                    value === country.name ? 'bg-orange-50' : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${
                          value === country.name
                            ? 'text-[#F05C0C]'
                            : 'text-gray-900'
                        }`}
                      >
                        {country.name}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-1">
                        {country.code} • {country.currency_symbol}
                      </Text>
                    </View>
                    {value === country.name && (
                      <Ionicons name="checkmark" size={20} color="#F05C0C" />
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};
