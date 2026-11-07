import React from 'react';
import { View, Text } from 'react-native';

interface ForgotPasswordHeaderProps {
  title: string;
  description: string;
}

const ForgotPasswordHeader: React.FC<ForgotPasswordHeaderProps> = ({
  title,
  description,
}) => {
  return (
    <View className="mb-8 mt-16">
      <Text className="text-4xl font-bold text-gray-900 mb-2">{title}</Text>
      <Text className="text-gray-600 text-base leading-6 mb-10">
        {description}
      </Text>
    </View>
  );
};

export default ForgotPasswordHeader;
