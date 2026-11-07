import React from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { Button } from '@/components/shared/ui';

interface VerificationCodeInputProps {
  verificationCode: string;
  onChangeCode: (code: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isValid?: boolean;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  verificationCode,
  onChangeCode,
  onSubmit,
  isLoading,
  isValid = verificationCode.length >= 6,
}) => {
  return (
    <View className="w-full">
      <Text className="text-base font-medium text-gray-700 mb-2">
        Verification Code
      </Text>
      <TextInput
        className="h-14 border border-gray-300 rounded-lg px-4 text-base mb-6"
        placeholder="Enter 6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={verificationCode}
        onChangeText={onChangeCode}
      />

      <Button
        onPress={onSubmit}
        title={isLoading ? 'Verifying...' : 'Verify Email'}
        containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-6 py-4"
        textClassName="text-white font-semibold text-base"
        disabled={isLoading || !isValid}
      >
        {isLoading && <ActivityIndicator color="white" className="ml-2" />}
      </Button>
    </View>
  );
};
