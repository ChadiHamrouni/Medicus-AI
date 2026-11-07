import React from 'react';
import { Text, View } from 'react-native';

const SignInHeader: React.FC = () => {
  return (
    <View className="mb-8 mt-16 px-6">
      <Text className="text-4xl font-normal mb-2 text-gray-900">
        Welcome Back
      </Text>
      <Text className="text-base text-gray-600 mb-10">
        Sign in to your account
      </Text>
    </View>
  );
};

export default SignInHeader;
