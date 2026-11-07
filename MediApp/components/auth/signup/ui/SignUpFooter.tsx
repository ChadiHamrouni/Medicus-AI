import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const SignUpFooter = () => {
  const router = useRouter();
  return (
    // <View className="absolute bottom-0 left-0 right-0 mt-6">
    <View className="flex-row justify-center items-center">
      <Text className="text-gray-600">Already have an account?</Text>
      <TouchableOpacity
        className="ml-2"
        onPress={() => router.push('/(SignIn)/SignInScreen')}
      >
        <Text className="text-[#F05C0C] font-semibold">Sign in</Text>
      </TouchableOpacity>
    </View>
    // </View>
  );
};

export default SignUpFooter;
