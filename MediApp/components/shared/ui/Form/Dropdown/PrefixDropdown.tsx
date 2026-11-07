import { PREFIXES } from '@/constants';
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
interface PrefixDropdownProps {
  value: string;
  onValueChange: (_prefixName: string) => void;
  label: string;
  isActive?: boolean;
  borderColor?: string;
  labelStyle?: object;
  onFocus?: () => void;
  onBlur?: () => void;
  isLoading?: boolean;
}

export const PrefixDropdown: React.FC<PrefixDropdownProps> = ({
  value,
  onValueChange,
  label,
  isActive = false,
  borderColor = '#E5E7EB',
  labelStyle = {},
  onFocus,
  onBlur,
  isLoading = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter prefixes based on search query
  const filteredPrefixes = PREFIXES.filter(prefix =>
    prefix.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrefixSelect = (prefix: (typeof PREFIXES)[0]) => {
    onValueChange(prefix.value);
    setModalVisible(false);
    setSearchQuery('');
    onBlur?.();
  };

  const handleModalOpen = () => {
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
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <Pressable
          onPress={handleModalOpen}
          disabled={isLoading}
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
                  {value || 'Select Prefix'}
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
                Select Prefix
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
                placeholder="Search prefixes..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Prefixes List */}
          <ScrollView className="flex-1">
            {isLoading ? (
              <View className="flex-1 items-center justify-center py-12">
                <ActivityIndicator size="large" color="#F05C0C" />
                <Text className="text-gray-500 mt-3">Loading prefixes...</Text>
              </View>
            ) : filteredPrefixes.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="person-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3 text-center">
                  {searchQuery ? 'No prefixes found' : 'No prefixes available'}
                </Text>
              </View>
            ) : (
              filteredPrefixes.map(prefix => (
                <Pressable
                  key={prefix.key}
                  onPress={() => handlePrefixSelect(prefix)}
                  className={`px-6 py-4 border-b border-gray-50 ${
                    value === prefix.value ? 'bg-orange-50' : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${
                          value === prefix.value
                            ? 'text-[#F05C0C]'
                            : 'text-gray-900'
                        }`}
                      >
                        {prefix.value}
                      </Text>
                    </View>
                    {value === prefix.value && (
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
