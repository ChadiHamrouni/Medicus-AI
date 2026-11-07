import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

interface MedicalSchoolDropdownProps {
  field: string;
  value: string;
  label: string;
  isActive: boolean;
  borderColor: Animated.AnimatedInterpolation<string | number> | string;
  labelStyle: any;
  onFocus?: () => void;
  onBlur?: () => void;
  onValueChange?: (_value: string) => void;
}

export const MedicalSchoolDropdown: React.FC<MedicalSchoolDropdownProps> = ({
  value,
  label,
  isActive,
  borderColor,
  labelStyle,
  onFocus,
  onBlur,
  onValueChange,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const medicalSchools = [
    { id: '1', name: 'Harvard Medical School' },
    { id: '2', name: 'Johns Hopkins School of Medicine' },
    { id: '3', name: 'Stanford University School of Medicine' },
    { id: '4', name: 'University of California, San Francisco' },
    { id: '5', name: 'Mayo Clinic Alix School of Medicine' },
    { id: '6', name: 'Washington University School of Medicine' },
    { id: '7', name: 'University of Pennsylvania Perelman School of Medicine' },
    {
      id: '8',
      name: 'Columbia University Vagelos College of Physicians and Surgeons',
    },
    { id: '9', name: 'Yale School of Medicine' },
    { id: '10', name: 'University of Michigan Medical School' },
    { id: '11', name: 'Duke University School of Medicine' },
    { id: '12', name: 'Northwestern University Feinberg School of Medicine' },
    { id: '13', name: 'Vanderbilt University School of Medicine' },
    { id: '14', name: 'University of Chicago Pritzker School of Medicine' },
    { id: '15', name: 'Other' },
  ];

  // Filter schools based on search query
  const filteredSchools = medicalSchools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSchoolSelect = (schoolName: string) => {
    setSelectedOptions([schoolName]);
    onValueChange?.(schoolName);
    setModalVisible(false);
    setSearchQuery('');
    onBlur?.();
  };

  const handleModalOpen = () => {
    setModalVisible(true);
    setSelectedOptions(value ? [value] : []);
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
        style={{ borderColor: isActive ? '#F05C0C' : borderColor }}
        className="relative border rounded-lg"
      >
        <Pressable onPress={handleModalOpen} className="p-3">
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
              <Text className="text-base text-gray-900" numberOfLines={1}>
                {value || 'Select medical school'}
              </Text>
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
                Select Medical Schools
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
                placeholder="Search medical schools..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Schools List */}
          <ScrollView className="flex-1">
            {filteredSchools.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="school-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3 text-center">
                  {searchQuery
                    ? 'No medical schools found'
                    : 'No medical schools available'}
                </Text>
              </View>
            ) : (
              filteredSchools.map(school => (
                <Pressable
                  key={school.id}
                  onPress={() => handleSchoolSelect(school.name)}
                  className={`px-6 py-4 border-b border-gray-50 ${
                    selectedOptions.includes(school.name) ? 'bg-orange-50' : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${
                          selectedOptions.includes(school.name)
                            ? 'text-[#F05C0C]'
                            : 'text-gray-900'
                        }`}
                      >
                        {school.name}
                      </Text>
                    </View>
                    {selectedOptions.includes(school.name) && (
                      <Ionicons name="checkmark" size={20} color="#F05C0C" />
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Footer with cancel button */}
          <View className="px-6 py-4 border-t border-gray-200 bg-white pb-8">
            <Pressable
              className="bg-gray-100 py-4 px-4 rounded-lg"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-gray-700 text-center font-medium text-base">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
