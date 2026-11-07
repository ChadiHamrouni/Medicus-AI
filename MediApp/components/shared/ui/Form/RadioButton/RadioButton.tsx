import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface RadioButtonProps {
  isSelected: boolean;
  onSelect: () => void;
  label?: string;
  size?: number;
  containerClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  type?: 'radio' | 'checkbox';
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  isSelected,
  onSelect,
  label,
  size = 24,
  containerClassName = '',
  buttonClassName = '',
  labelClassName = '',
  iconName = 'check',
  iconSize = 20,
  iconColor = 'white',
  type = 'radio',
}) => {
  const getButtonStyle = () => {
    const baseStyle = `items-center justify-center ${type === 'checkbox' ? 'rounded' : 'rounded-full'}`;
    const selectedStyle = isSelected ? 'bg-[#F05C0C]' : 'bg-gray-200';
    return `${baseStyle} ${selectedStyle} ${buttonClassName}`;
  };

  return (
    <View className={`flex-row items-center ${containerClassName}`}>
      <TouchableOpacity
        onPress={onSelect}
        className={getButtonStyle()}
        style={{ width: size, height: size }}
      >
        {isSelected && (
          <MaterialCommunityIcons
            name={iconName}
            size={iconSize}
            color={iconColor}
          />
        )}
      </TouchableOpacity>
      {label && (
        <Text className={`text-gray-700 ml-2 ${labelClassName}`}>{label}</Text>
      )}
    </View>
  );
};
