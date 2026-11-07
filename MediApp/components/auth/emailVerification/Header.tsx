import React from 'react';
import { View, Text } from 'react-native';

interface EmailVerificationHeaderProps {
  title: string;
  subtitle?: string;
}

export const EmailVerificationHeader: React.FC<
  EmailVerificationHeaderProps
> = ({ title, subtitle }) => {
  return (
    <View className="mb-8">
      <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-base text-gray-600 text-center leading-6">
          {subtitle}
        </Text>
      )}
    </View>
  );
};
