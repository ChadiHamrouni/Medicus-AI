import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ResendCodeButtonProps {
  canResend: boolean;
  timeLeft: number;
  resendLoading: boolean;
  onResend: () => void;
}

export const ResendCodeButton: React.FC<ResendCodeButtonProps> = ({
  canResend,
  timeLeft,
  resendLoading,
  onResend,
}) => {
  return (
    <View className="flex-row justify-center items-center">
      <Text className="text-sm text-gray-600">Did not receive the code? </Text>
      {canResend ? (
        <TouchableOpacity onPress={onResend} disabled={resendLoading}>
          <Text className="text-sm font-semibold text-[#F05C0C]">
            {resendLoading ? 'Sending...' : 'Resend Code'}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text className="text-sm font-medium text-gray-400">
          Resend in {timeLeft}s
        </Text>
      )}
    </View>
  );
};
