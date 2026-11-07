import React from 'react';
import { View, Text } from 'react-native';

const Divider = () => {
  return (
    <View className="flex-row items-center my-6">
      <View className="flex-1 h-[1px] bg-gray-200" />
      <Text className="mx-4 text-gray-500">or</Text>
      <View className="flex-1 h-[1px] bg-gray-200" />
    </View>
  );
};

export default Divider;
