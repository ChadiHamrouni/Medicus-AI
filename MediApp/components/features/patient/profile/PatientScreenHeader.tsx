import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { goToPatientProfile } from '@/utils';

interface PatientScreenHeaderProps {
  title: string;
}

const PatientScreenHeader: React.FC<PatientScreenHeaderProps> = ({ title }) => {
  const handleBackPress = () => {
    goToPatientProfile();
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-5 border-b border-gray-200">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={handleBackPress}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F05C0C" />
        </TouchableOpacity>
        <Text className="ml-4 text-xl font-bold text-gray-900">{title}</Text>
      </View>
    </View>
  );
};

export default PatientScreenHeader;
