import { useSpecialtiesQuery } from '@/hooks/doctor/queries/useDoctorProfileQueries';
import { useAuthContext } from '@/contexts/AuthContext';
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
interface OtherSpecialtiesDropdownProps {
  field: string;
  value: string;
  label: string;
  isActive: boolean;
  borderColor: Animated.AnimatedInterpolation<string | number> | string;
  labelStyle: any;
  onFocus?: () => void;
  onBlur?: () => void;
  onValueChange?: (_value: string) => void;
  onSpecialtyIdsChange?: (_ids: number[]) => void;
}

export const OtherSpecialtiesDropdown: React.FC<
  OtherSpecialtiesDropdownProps
> = ({
  value,
  label,
  isActive,
  borderColor,
  labelStyle,
  onFocus,
  onBlur,
  onValueChange,
  onSpecialtyIdsChange,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  // Use cached profile data from login instead of separate API call
  const { authState } = useAuthContext();
  const profile = authState.doctorProfile;
  const { data: specialtiesData, isLoading } = useSpecialtiesQuery();

  // Get available specialties excluding main specialty
  const availableSpecialties = React.useMemo(() => {
    if (!specialtiesData?.specialties) return [];

    const mainSpecialty = profile?.specialty;
    return specialtiesData.specialties
      .filter(specialty => specialty.name !== mainSpecialty)
      .map(specialty => ({
        id: specialty.id,
        name: specialty.name,
      }));
  }, [specialtiesData, profile?.specialty]);

  // Filter specialties based on search query
  const filteredSpecialties = availableSpecialties.filter(specialty =>
    specialty.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSpecialtySelect = (specialtyId: number) => {
    setSelectedOptions(prev => {
      if (prev.includes(specialtyId)) {
        return prev.filter(id => id !== specialtyId);
      } else {
        return [...prev, specialtyId];
      }
    });
  };

  const handleModalOpen = () => {
    if (isLoading) return;
    setModalVisible(true);
    // Convert value string back to specialty IDs
    const selectedNames = value ? value.split(', ').filter(Boolean) : [];
    const selectedIds = availableSpecialties
      .filter(specialty => selectedNames.includes(specialty.name))
      .map(specialty => specialty.id);
    setSelectedOptions(selectedIds);
    onFocus?.();
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSearchQuery('');
    if (selectedOptions.length > 0) {
      // Convert IDs back to names for display
      const selectedNames = availableSpecialties
        .filter(specialty => selectedOptions.includes(specialty.id))
        .map(specialty => specialty.name);
      onValueChange?.(selectedNames.join(', '));
    }
    onBlur?.();
  };

  const handleDone = () => {
    // Pass specialty IDs to parent
    onSpecialtyIdsChange?.(selectedOptions);

    if (selectedOptions.length > 0) {
      // Convert IDs back to names for display
      const selectedNames = availableSpecialties
        .filter(specialty => selectedOptions.includes(specialty.id))
        .map(specialty => specialty.name);
      onValueChange?.(selectedNames.join(', '));
    } else {
      onValueChange?.('');
    }
    setModalVisible(false);
    setSearchQuery('');
    onBlur?.();
  };

  return (
    <View>
      <Animated.View
        style={{ borderColor: isActive ? '#F05C0C' : borderColor }}
        className={`relative border rounded-lg ${isLoading ? 'opacity-50' : ''}`}
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
                <Text className="text-base text-gray-900" numberOfLines={1}>
                  {value || 'Select other specialties'}
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
                Select Other Specialties
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
                placeholder="Search specialties..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Specialties List */}
          <ScrollView className="flex-1">
            {isLoading ? (
              <View className="flex-1 items-center justify-center py-12">
                <ActivityIndicator size="large" color="#F05C0C" />
                <Text className="text-gray-500 mt-3">
                  Loading specialties...
                </Text>
              </View>
            ) : filteredSpecialties.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="medical-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-3 text-center">
                  {searchQuery
                    ? 'No specialties found'
                    : 'No specialties available'}
                </Text>
              </View>
            ) : (
              filteredSpecialties.map(specialty => (
                <Pressable
                  key={specialty.id}
                  onPress={() => handleSpecialtySelect(specialty.id)}
                  className={`px-6 py-4 border-b border-gray-50 ${
                    selectedOptions.includes(specialty.id) ? 'bg-orange-50' : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${
                          selectedOptions.includes(specialty.id)
                            ? 'text-[#F05C0C]'
                            : 'text-gray-900'
                        }`}
                      >
                        {specialty.name}
                      </Text>
                    </View>
                    {selectedOptions.includes(specialty.id) && (
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
