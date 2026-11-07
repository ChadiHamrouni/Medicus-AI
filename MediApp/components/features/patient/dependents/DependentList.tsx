import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { EmergencyContact } from '@/types';

export interface DependentData {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  age: number;
  relationship: string;
  dob: string;
  gender?: string;
  emergency_contact: EmergencyContact[];
  wa_number?: string;
  status: string;
}

interface DependentListProps {
  dependents: DependentData[];
  mainPatient?: DependentData;
  onAddDependent?: () => void;
  onEditDependent?: (_dependent: DependentData) => void;
  onSwitchContext?: (_dependent: DependentData) => void;
  onViewDependent?: (_dependent: DependentData) => void;
  onDeleteDependent?: (_dependent: DependentData) => void;
  currentPatientId?: number;
  isLoading?: boolean;
}

const DependentList: React.FC<DependentListProps> = ({
  dependents,
  mainPatient,
  // onAddDependent,
  onEditDependent,
  onSwitchContext,
  onViewDependent,
  onDeleteDependent,
  currentPatientId,
  isLoading = false,
}) => {
  const formatRelationship = (relationship: string) => {
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
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

  const renderPatientCard = (
    patient: DependentData,
    isMain: boolean = false
  ) => {
    const isCurrentlyActive = currentPatientId === patient.id;

    return (
      <TouchableOpacity
        key={patient.id}
        className={`w-full p-4 rounded-xl mb-3 ${isCurrentlyActive ? 'bg-orange-50 border border-[#FEE2D5]' : 'bg-white border border-gray-100'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}
        onPress={() => onViewDependent && onViewDependent(patient)}
        disabled={isLoading}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text className="text-xl font-bold text-gray-900">
                {patient.full_name}
              </Text>
              {isCurrentlyActive && (
                <View className="ml-3 px-3 py-1 bg-[#F05C0C] rounded-full">
                  <Text className="text-sm text-white font-semibold">
                    Active
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center mb-3">
              <View
                className={`px-3 py-1 rounded-full ${getRelationshipColor(patient.relationship)}`}
              >
                <Text className="text-sm font-semibold">
                  {formatRelationship(patient.relationship)}
                </Text>
              </View>
              <Text className="text-base text-gray-700 ml-3 font-medium">
                Age {patient.age}
              </Text>
              {patient.gender && (
                <Text className="text-base text-gray-700 ml-3 font-medium">
                  • {patient.gender}
                </Text>
              )}
            </View>

            <View className="mb-2">
              <Text className="text-base text-gray-700 font-medium">
                Emergency: {patient.emergency_contact[0]?.name || 'N/A'} (
                {patient.emergency_contact[0]?.phone || 'N/A'})
              </Text>
            </View>

            {patient.wa_number && (
              <Text className="text-base text-gray-700 font-medium">
                WhatsApp: {patient.wa_number}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row">
            {onSwitchContext && !isCurrentlyActive && (
              <TouchableOpacity
                onPress={() => onSwitchContext(patient)}
                className="px-4 py-2 bg-[#F05C0C] rounded-xl mr-2 active:bg-[#E04F0A]"
                disabled={isLoading}
              >
                <Text className="text-base text-white font-semibold">
                  Switch
                </Text>
              </TouchableOpacity>
            )}

            {!isMain && onEditDependent && (
              <TouchableOpacity
                onPress={() => onEditDependent(patient)}
                className="px-4 py-2 bg-gray-100 rounded-xl mr-2 active:bg-gray-200"
                disabled={isLoading}
              >
                <Text className="text-base text-gray-800 font-semibold">
                  Edit
                </Text>
              </TouchableOpacity>
            )}

            {!isMain && onDeleteDependent && (
              <TouchableOpacity
                onPress={() => onDeleteDependent(patient)}
                className="px-4 py-2 bg-red-100 rounded-xl active:bg-red-200"
                disabled={isLoading}
              >
                <Text className="text-base text-red-700 font-semibold">
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Indicator */}
        {isCurrentlyActive && (
          <View className="mt-3 pt-3 border-t border-gray-200">
            <Text className="text-base text-[#F05C0C] font-semibold">
              Currently Active
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-gray-600">Loading dependents...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View></View>

        {/* {onAddDependent && (
          <Button
            onPress={onAddDependent}
            title="Add"
            containerClassName="px-4 py-2 bg-[#F05C0C] rounded-lg"
            textClassName="text-white font-seZmibold text-sm"
            disabled={isLoading}
          />
        )} */}
      </View>

      {/* Main Patient Section */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Primary Account
        </Text>
        {mainPatient ? (
          renderPatientCard(mainPatient, true)
        ) : (
          <View
            className="w-full p-4 rounded-xl mb-3 bg-white border border-gray-100 items-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 2,
            }}
          >
            <Text className="text-sm text-gray-600">
              Loading primary account...
            </Text>
          </View>
        )}
      </View>

      {/* Dependents Section */}
      <View className="mb-2">
        <Text className="text-lg font-semibold text-gray-800 mb-2">
          Dependents ({dependents.length})
        </Text>
        {dependents.map(dependent => renderPatientCard(dependent, false))}
      </View>
    </ScrollView>
  );
};

export default DependentList;
