import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  style?: ViewStyle;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onPress,
  style,
  activeOpacity = 0.8,
}) => {
  const baseClasses =
    'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden';
  const combinedClasses = `${baseClasses} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className={combinedClasses}
        style={style}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={combinedClasses} style={style}>
      {children}
    </View>
  );
};
