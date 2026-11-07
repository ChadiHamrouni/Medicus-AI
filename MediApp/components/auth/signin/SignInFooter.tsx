import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const SignInFooter: React.FC = () => {
  const router = useRouter();

  return (
    <View className="flex-row justify-center items-center mt-6 ">
      <Text className="text-gray-600 text-lg">Don&apos;t have an account? </Text>
      <TouchableOpacity
        onPress={() => router.push('/(SignUp)/RoleSelectionScreen')}
      >
        <Text className="text-[#F05C0C] font-medium text-lg">Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignInFooter;
