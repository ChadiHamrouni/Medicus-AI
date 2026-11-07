import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: object;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  icon,
  style,
}) => {
  return (
    <TouchableOpacity
      className={`bg-orange-500 rounded-xl py-4 flex-row justify-center items-center shadow-lg ${
        disabled || isLoading ? 'bg-orange-300' : ''
      }`}
      style={style}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <View className="flex-row items-center">
          {icon && (
            <MaterialCommunityIcons
              name={icon as any}
              size={20}
              color="white"
            />
          )}
          <Text className="text-white text-base font-semibold ml-2">
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
