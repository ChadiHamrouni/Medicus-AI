import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

export interface ButtonProps {
  onPress: () => void;
  title: string;
  containerClassName?: string;
  textClassName?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  containerClassName = 'w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center py-4',
  textClassName = 'text-white font-semibold text-base',
  disabled = false,
  children,
  iconPosition = 'right',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={containerClassName}
      disabled={disabled}
      activeOpacity={1}
    >
      <View className="flex-row items-center justify-center">
        {iconPosition === 'left' && children}
        <Text className={textClassName}>{title}</Text>
        {iconPosition === 'right' && children}
      </View>
    </TouchableOpacity>
  );
};
