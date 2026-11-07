import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  containerClassName?: string;
  textClassName?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  containerClassName = '',
  textClassName = '',
  disabled = false,
  children,
}) => {
  return (
    <TouchableOpacity
      className={`${containerClassName || `bg-[#F05C0C] py-4 px-8 rounded-lg items-center justify-center ${disabled ? 'opacity-50' : ''}`}`}
      onPress={onPress}
      disabled={disabled}
    >
      <View className="flex-row items-center justify-center">
        <Text className={textClassName || 'text-white'}>{title}</Text>
        {children}
      </View>
    </TouchableOpacity>
  );
};
