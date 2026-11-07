import React from 'react';
import { View, Text } from 'react-native';

interface ProfileCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <View className={`mb-4 ${className}`}>
      {title && (
        <Text className="text-base font-semibold text-gray-700 mb-2 px-4">
          {title}
        </Text>
      )}
      <View className="">{children}</View>
    </View>
  );
};
