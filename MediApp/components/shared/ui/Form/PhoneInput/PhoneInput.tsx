import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { countryCodes } from './countryCodes';

interface PhoneInputProps {
  value: string;
  onChangeText: (_text: string) => void;
  onChangeCountry: (_countryCode: string) => void;
  label: string;
  isActive: boolean;
  borderColor: any;
  labelStyle: any;
  onFocus: () => void;
  onBlur: () => void;
  errorMessage?: string;
  selectedCountryCode: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  onChangeCountry,
  label,
  isActive,
  borderColor: propBorderColor,
  labelStyle,
  onFocus,
  onBlur,
  errorMessage,
  selectedCountryCode,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation setup
  const animValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: false,
      tension: 20,
      friction: 3,
    }).start();
  }, [isActive, animValue]);

  const animatedBorderColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#D1D5DB', '#F05C0C'],
  });

  const animatedLabelColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#6B7280', '#F05C0C'],
  });

  // Use the provided border color if it's a string (for error states)
  const borderColor =
    typeof propBorderColor === 'string' ? propBorderColor : animatedBorderColor;

  // Find the selected country data
  const selectedCountry =
    countryCodes.find(country => country.code === selectedCountryCode) ||
    countryCodes[0];

  // Filter countries based on search query
  const filteredCountries = searchQuery
    ? countryCodes.filter(
        country =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.dial_code.includes(searchQuery)
      )
    : countryCodes;

  const handleSelectCountry = (country: (typeof countryCodes)[0]) => {
    onChangeCountry(country.code);
    setModalVisible(false);
    setSearchQuery('');
    onBlur();
  };

  const handleOpenModal = () => {
    setModalVisible(true);
    onFocus();
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    onBlur();
  };

  return (
    <View className="mb-4">
      <TouchableOpacity onPress={handleOpenModal} activeOpacity={1}>
        <Animated.View
          style={{
            borderWidth: 1,
            borderColor: errorMessage
              ? '#EF4444'
              : isActive
                ? '#F05C0C'
                : borderColor,
            borderRadius: 8,
            position: 'relative',
          }}
        >
          <Animated.Text
            style={[
              labelStyle,
              {
                color: errorMessage
                  ? '#EF4444'
                  : isActive
                    ? '#F05C0C'
                    : typeof propBorderColor === 'string'
                      ? propBorderColor
                      : animatedLabelColor,
              },
            ]}
          >
            {label}
          </Animated.Text>

          {/* Phone Input Container */}
          <View
            className={`flex-row items-center px-4 ${
              Platform.OS === 'ios' && 'h-12' // To fix problem of the text on android
            }`}
          >
            {/* Country Code Display */}
            <View className="flex-row items-center">
              <Text className="text-base mr-2">{selectedCountry.flag}</Text>
              <Text className="text-sm text-gray-700 mr-2">
                {selectedCountry.dial_code}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={isActive ? '#F05C0C' : '#6B7280'}
                className="mr-2"
              />
            </View>

            {/* Divider */}
            <View className="h-6 w-[1px] bg-gray-300 mx-2" />

            {/* Phone Number Input */}
            <TextInput
              className="flex-1 h-full text-base text-gray-800"
              value={value}
              onChangeText={onChangeText}
              onFocus={onFocus}
              onBlur={onBlur}
              keyboardType="phone-pad"
              placeholder="Phone number"
            />
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Error Message */}
      {errorMessage && (
        <Text className="text-red-500 text-xs mt-1 ml-1">{errorMessage}</Text>
      )}

      {/* Country Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white rounded-lg w-[90%] max-h-[80%] overflow-hidden">
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-800">
                Select Country
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="flex-row items-center mx-4 my-3 px-3 bg-gray-100 rounded-lg">
              <Ionicons
                name="search"
                size={20}
                color="#6B7280"
                className="mr-2"
              />
              <TextInput
                className="flex-1 h-full text-base"
                placeholder="Search countries"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {/* Countries List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-row items-center py-3 px-5 border-b border-gray-200 ${
                    selectedCountryCode === item.code ? 'bg-orange-50' : ''
                  }`}
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text className="text-2xl mr-3">{item.flag}</Text>
                  <Text className="flex-1 text-base text-gray-800">
                    {item.name}
                  </Text>
                  <Text
                    className={`text-sm ${
                      selectedCountryCode === item.code
                        ? 'text-[#F05C0C]'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.dial_code}
                  </Text>
                </TouchableOpacity>
              )}
              className="max-h-[500px]"
            />

            {/* Done Button */}
            <TouchableOpacity
              onPress={handleCloseModal}
              className="bg-[#F05C0C] py-3 m-4 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
