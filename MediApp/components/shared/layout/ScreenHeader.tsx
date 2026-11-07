import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  showBackButton = true,
}) => {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      className={`flex-row items-center justify-between px-4 ${Platform.OS === 'android' ? 'py-5' : 'py-4'} border-b border-gray-200 bg-white`}
    >
      <View className="flex-row items-center">
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#F05C0C"
            />
          </TouchableOpacity>
        )}
        <Text
          className={`${showBackButton ? 'ml-4' : ''} text-xl font-bold text-gray-900`}
        >
          {title}
        </Text>
      </View>
    </View>
  );
};
