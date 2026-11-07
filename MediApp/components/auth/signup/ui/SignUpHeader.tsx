import React from 'react';
import { Image, Text, View } from 'react-native';

const SignUpHeader: React.FC = () => {
  return (
    <View className="mt-20 px-6 items-center">
      {/* Brand Logo - using taskify logo */}
      <Image
        source={require('@/assets/images/taskify.png')}
        className="w-64 h-24 mb-4"
        resizeMode="contain"
      />

      {/* Main Title */}
      {/* <Text className="text-3xl font-bold mb-2 text-gray-900 text-center mb-16">
        Welcome to Medicus!
      </Text> */}

      {/* Tagline */}
      {/* <Text className="text-lg font-medium text-[#F05C0C] mb-2 text-center">
        Your AI healthcare companion
      </Text> */}
    </View>
  );
};

export default SignUpHeader;
