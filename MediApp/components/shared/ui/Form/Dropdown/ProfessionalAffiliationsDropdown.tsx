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

interface ProfessionalAffiliationsDropdownProps {
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

export const ProfessionalAffiliationsDropdown: React.FC<
  ProfessionalAffiliationsDropdownProps
> = ({
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

  const professionalAffiliations = [
    { id: '1', name: 'American Medical Association (AMA)' },
    { id: '2', name: 'American College of Physicians (ACP)' },
    { id: '3', name: 'American Academy of Family Physicians (AAFP)' },
    { id: '4', name: 'American College of Surgeons (ACS)' },
    { id: '5', name: 'American Heart Association (AHA)' },
    { id: '6', name: 'American Cancer Society (ACS)' },
    { id: '7', name: 'American Academy of Pediatrics (AAP)' },
    { id: '8', name: 'American College of Cardiology (ACC)' },
    { id: '9', name: 'American Psychiatric Association (APA)' },
    { id: '10', name: 'American Academy of Dermatology (AAD)' },
    { id: '11', name: 'American College of Emergency Physicians (ACEP)' },
    { id: '12', name: 'American Academy of Neurology (AAN)' },
    {
      id: '13',
      name: 'American College of Obstetricians and Gynecologists (ACOG)',
    },
    { id: '14', name: 'American Urological Association (AUA)' },
    { id: '15', name: 'American Academy of Ophthalmology (AAO)' },
    {
      id: '16',
      name: 'Healthcare Information and Management Systems Society (HIMSS)',
    },
    { id: '17', name: 'American Organization for Nursing Leadership (AONL)' },
    { id: '18', name: 'Other' },
  ];

  // Filter affiliations based on search query
  const filteredAffiliations = professionalAffiliations.filter(affiliation =>
    affiliation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAffiliationSelect = (affiliationName: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(affiliationName)) {
        return prev.filter(v => v !== affiliationName);
      } else {
        return [...prev, affiliationName];
      }
    });
  };

  const handleModalOpen = () => {
    setModalVisible(true);
    setSelectedOptions(value ? value.split(', ').filter(Boolean) : []);
    onFocus?.();
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSearchQuery('');
    if (selectedOptions.length > 0) {
      onValueChange?.(selectedOptions.join(', '));
    }
    onBlur?.();
  };

  const handleDone = () => {
    if (selectedOptions.length > 0) {
      onValueChange?.(selectedOptions.join(', '));
    }
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
                {value || 'Select professional affiliations'}
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
                Select Professional Affiliations
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
                placeholder="Search affiliations..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Affiliations List */}
          <ScrollView className="flex-1">
            {filteredAffiliations.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="business-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3 text-center">
                  {searchQuery
                    ? 'No affiliations found'
                    : 'No affiliations available'}
                </Text>
              </View>
            ) : (
              filteredAffiliations.map(affiliation => (
                <Pressable
                  key={affiliation.id}
                  onPress={() => handleAffiliationSelect(affiliation.name)}
                  className={`px-6 py-4 border-b border-gray-50 ${
                    selectedOptions.includes(affiliation.name)
                      ? 'bg-orange-50'
                      : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${
                          selectedOptions.includes(affiliation.name)
                            ? 'text-[#F05C0C]'
                            : 'text-gray-900'
                        }`}
                      >
                        {affiliation.name}
                      </Text>
                    </View>
                    {selectedOptions.includes(affiliation.name) && (
                      <Ionicons name="checkmark" size={20} color="#F05C0C" />
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Footer with selected count and Done button */}
          <View className="px-6 py-4 border-t border-gray-200 bg-white pb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm text-gray-600">
                {selectedOptions.length} selected
              </Text>
              {selectedOptions.length > 0 && (
                <Pressable
                  onPress={() => setSelectedOptions([])}
                  className="px-3 py-1"
                >
                  <Text className="text-[#F05C0C] text-sm font-medium">
                    Clear All
                  </Text>
                </Pressable>
              )}
            </View>
            <Pressable
              className="bg-[#F05C0C] py-4 px-4 rounded-lg"
              onPress={handleDone}
            >
              <Text className="text-white text-center font-semibold text-base">
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
