import React from 'react';
import { View, Text } from 'react-native';

interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const InfoSection: React.FC<InfoSectionProps> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <View className={`mb-6 ${className}`}>
      <Text className="text-lg font-semibold text-gray-800 mb-3">{title}</Text>
      <View className="bg-gray-50 rounded-lg p-4">{children}</View>
    </View>
  );
};
