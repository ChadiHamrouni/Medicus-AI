import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ForgotPasswordFooterProps {
  onSignInPress: () => void;
}

const ForgotPasswordFooter: React.FC<ForgotPasswordFooterProps> = ({
  onSignInPress,
}) => {
  return (
    <View className="flex-row justify-center items-center mt-6 mb-4">
      <Text className="text-gray-600">Remember your password? </Text>
      <TouchableOpacity onPress={onSignInPress}>
        <Text className="text-[#F05C0C] font-medium">Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ForgotPasswordFooter;
