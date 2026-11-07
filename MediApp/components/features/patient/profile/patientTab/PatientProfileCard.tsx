import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PatientProfileCardProps {
  name: string;
  avatar: string;
  isMainPatient: boolean;
  relationship: string;
  age?: number | undefined;
  gender?: string;
  isDoctor?: boolean;
  viewingAsPatient?: boolean;
  onToggleViewMode?: () => void;
  onExit?: () => void;
}

export const PatientProfileCard: React.FC<PatientProfileCardProps> = ({
  name,
  avatar,
  isMainPatient,
  age,
  gender,
  isDoctor = false,
  viewingAsPatient = false,
  onToggleViewMode,
  onExit,
}) => {
  return (
    <View className="bg-white mx-4 rounded-lg border-b border-gray-200 mt-2">
      <View className="p-3">
        <View className="flex-row items-center">
          {/* Patient Avatar */}
          <View className="relative mr-4">
            <Image
              source={
                avatar && isMainPatient
                  ? { uri: avatar }
                  : require('@/assets/images/Dummy-User-M.png')
              }
              style={{ width: 72, height: 72 }}
              className="rounded-full"
            />
            {/* Dependent indicator */}
            {!isMainPatient && (
              <View
                className="absolute -top-1 -right-1 bg-teal-500 rounded-full items-center justify-center border-2 border-white"
                style={{ width: 27, height: 27 }}
              >
                <MaterialCommunityIcons
                  name="account-child"
                  size={13}
                  color="white"
                />
              </View>
            )}
          </View>

          {/* Patient Info */}
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 mb-2">{name}</Text>
            <View className="flex-row">
              {age !== undefined && age !== 0 && (
                <View className="bg-orange-50 px-3 py-1 rounded-full mr-2">
                  <Text className="text-sm font-semibold text-orange-600">
                    {age} yo
                  </Text>
                </View>
              )}
              {gender && (
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                  <Text className="text-sm font-semibold text-blue-600 capitalize">
                    {gender}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Exit button when viewing from MediDoc */}
          {onExit && (
            <TouchableOpacity
              onPress={onExit}
              className="ml-2 px-4 py-2 bg-orange-100 rounded-full flex-row items-center"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#F05C0C" />
              <Text className="text-orange-600 text-sm font-medium ml-1">
                Back to Chat
              </Text>
            </TouchableOpacity>
          )}

          {/* Doctor/Patient Toggle for Doctors */}
          {isDoctor && !onExit && (
            <View className="ml-2 items-center">
              <Text className="text-xs text-gray-500 mb-2">Viewing as</Text>
              <TouchableOpacity
                onPress={onToggleViewMode}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  viewingAsPatient
                    ? 'bg-teal-600 shadow-sm'
                    : 'bg-sky-400 shadow-sm'
                }`}
                activeOpacity={0.7}
              >
                <View className="w-2 h-2 bg-white rounded-full mr-2" />
                <Text className="text-white text-xs font-medium">
                  {viewingAsPatient ? 'Patient' : 'Doctor'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
