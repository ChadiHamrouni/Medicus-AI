import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface DoctorScreenHeaderProps {
  title: string;
}

const DoctorScreenHeader: React.FC<DoctorScreenHeaderProps> = ({ title }) => {
  const router = useRouter();

  const handleBackPress = () => {
    router.back();
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

export default DoctorScreenHeader;
