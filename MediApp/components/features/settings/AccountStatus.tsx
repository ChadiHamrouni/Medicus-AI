import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View, TextInput } from 'react-native';

interface AccountStatusProps {
  profileData: {
    email: string;
    phone: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  authUserEmail?: string;
  onSendEmailVerification: () => Promise<void>;
  onVerifyEmailCode: (_code: string) => Promise<void>;
  onPhoneVerification: () => void;
  isSendingVerification: boolean;
  isVerifyingCode: boolean;
  isRefreshingAfterVerification: boolean;
}

export const AccountStatus: React.FC<AccountStatusProps> = ({
  profileData,
  authUserEmail,
  onSendEmailVerification,
  onVerifyEmailCode,
  onPhoneVerification: _onPhoneVerification,
  isSendingVerification,
  isVerifyingCode,
  isRefreshingAfterVerification,
}) => {
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleSendEmailVerification = async () => {
    try {
      await onSendEmailVerification();
      setShowEmailVerification(true);

      Alert.alert(
        'Verification Email Sent',
        `A verification code has been sent to ${profileData.email}. Please check your email and enter the code below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to send verification email. Please try again.'
      );
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    try {
      await onVerifyEmailCode(verificationCode);

      // Reset verification form state immediately
      setShowEmailVerification(false);
      setVerificationCode('');

      // Show success message first
      Alert.alert(
        'Email Verified!',
        'Your email has been successfully verified. Your account status will be updated shortly.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid verification code. Please try again.'
      );
    }
  };

  const handleCancelVerification = () => {
    setShowEmailVerification(false);
    setVerificationCode('');
  };

  return (
    <View className="bg-white mx-4 mt-4 p-4">
      <Text className="text-lg font-semibold text-gray-900 mb-4">
        Account Authentication
      </Text>

      <TouchableOpacity
        className="flex-row items-center py-3 opacity-50"
        activeOpacity={1}
        disabled={true}
      >
        <View className="mr-4">
          <MaterialCommunityIcons
            name="two-factor-authentication"
            size={24}
            color="#6B7280"
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-400">
            Two-Factor Authentication
            <Text className="text-xs text-gray-400 font-normal">
              {' '}
              (Coming Soon)
            </Text>
          </Text>
          <Text className="text-sm text-gray-400">
            Add extra security to your account
          </Text>
        </View>
        <MaterialCommunityIcons
          name="toggle-switch-off"
          size={42}
          color="#D1D5DB"
        />
      </TouchableOpacity>
    </View>
  );
};
