import { DependentResponse } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface HeaderPatientSwitcherProps {
  currentPatient: DependentResponse;
  availablePatients: DependentResponse[];
  onSwitchPatient?: (_patient: DependentResponse) => void;
  isLoading?: boolean;
  compact?: boolean; // For smaller header spaces
}

const HeaderPatientSwitcher: React.FC<HeaderPatientSwitcherProps> = ({
  currentPatient,
  availablePatients,
  onSwitchPatient,
  isLoading = false,
  compact = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const formatRelationship = (relationship: string) => {
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'main':
        return '👤';
      case 'spouse':
        return '💑';
      case 'child':
        return '👶';
      case 'parent':
        return '👨‍👩‍👧‍👦';
      case 'sibling':
        return '👫';
      default:
        return '👥';
    }
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'main':
        return 'bg-blue-100 text-blue-800';
      case 'spouse':
        return 'bg-pink-100 text-pink-800';
      case 'child':
        return 'bg-green-100 text-green-800';
      case 'parent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePatientSelect = (patient: DependentResponse) => {
    setIsDropdownOpen(false);
    if (onSwitchPatient && patient.id !== currentPatient.id) {
      onSwitchPatient(patient);
    }
  };

  const showSwitcher = availablePatients.length > 1;

  // Don't show anything if there's only one patient
  if (!showSwitcher) {
    return null;
  }

  return (
    <View className="relative">
      {/* Switcher Button */}
      <TouchableOpacity
        onPress={() => setIsDropdownOpen(true)}
        disabled={isLoading}
        className={`${compact ? 'w-14 h-14' : 'w-16 h-16'} items-center justify-center bg-[#F05C0C] rounded-full shadow-md active:scale-95`}
        style={{ elevation: 4 }}
      >
        {/* Family Icon */}
        <MaterialCommunityIcons
          name="account-group"
          size={compact ? 20 : 24}
          color="white"
        />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
          <View className="flex-1 bg-black/50">
            <TouchableWithoutFeedback>
              <View className="mt-20 mx-4 bg-white rounded-lg shadow-lg max-h-96">
                {/* Header */}
                <View className="px-6 py-4 border-b border-gray-200">
                  <Text className="text-xl font-bold text-gray-900">
                    Switch Patient
                  </Text>
                  <Text className="text-base text-gray-700 mt-1">
                    Select which family member you&apos;re managing
                  </Text>
                </View>

                {/* Patient List */}
                <ScrollView className="max-h-80">
                  {availablePatients.map(patient => {
                    const isSelected = patient.id === currentPatient.id;

                    return (
                      <TouchableOpacity
                        key={patient.id}
                        onPress={() => handlePatientSelect(patient)}
                        className={`px-6 py-4 border-b border-gray-100 ${
                          isSelected ? 'bg-orange-50' : 'bg-white'
                        } active:bg-gray-50`}
                        disabled={isLoading}
                      >
                        <View className="flex-row items-center">
                          {/* Icon */}
                          <Text className="text-2xl mr-4">
                            {getRelationshipIcon(patient.relationship)}
                          </Text>

                          {/* Patient Info */}
                          <View className="flex-1">
                            <View className="flex-row items-center mb-2">
                              <Text className="text-lg font-semibold text-gray-900">
                                {patient.full_name}
                              </Text>
                              {isSelected && (
                                <View className="ml-3 px-3 py-1 bg-[#F05C0C] rounded-full">
                                  <Text className="text-sm text-white font-semibold">
                                    Active
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View className="flex-row items-center">
                              <View
                                className={`px-3 py-1 rounded-full ${getRelationshipColor(
                                  patient.relationship
                                )} mr-3`}
                              >
                                <Text className="text-sm font-semibold">
                                  {formatRelationship(patient.relationship)}
                                </Text>
                              </View>
                              <Text className="text-base text-gray-700 font-medium">
                                Age {patient.age}
                              </Text>
                            </View>
                          </View>

                          {/* Selection Indicator */}
                          {isSelected && (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={24}
                              color="#F05C0C"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Footer */}
                <View className="px-6 py-4 border-t border-gray-200">
                  <TouchableOpacity
                    onPress={() => setIsDropdownOpen(false)}
                    className="w-full py-3 bg-gray-100 rounded-xl items-center active:bg-gray-200"
                  >
                    <Text className="text-gray-800 font-semibold text-base">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default HeaderPatientSwitcher;
