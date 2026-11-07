import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

interface DangerZoneProps {
  onDeleteAccount: () => Promise<void>;
  onPasswordVerification: (_password: string) => Promise<void>;
}

export const DangerZone: React.FC<DangerZoneProps> = ({
  onDeleteAccount,
  onPasswordVerification,
}) => {
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action will permanently delete your account and all associated data. This cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => confirmAccountDeletion(),
        },
      ]
    );
  };

  const confirmAccountDeletion = () => {
    Alert.prompt(
      'Confirm Account Deletion',
      'Please enter your current password to confirm account deletion:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: (password?: string) => {
            if (!password || password.trim().length === 0) {
              Alert.alert(
                'Error',
                'Password is required to delete your account.'
              );
              return;
            }
            executeAccountDeletion(password);
          },
        },
      ],
      'secure-text'
    );
  };

  const executeAccountDeletion = async (password: string) => {
    try {
      // First verify the password
      await onPasswordVerification(password);

      // If password verification succeeds, proceed with account deletion
      await onDeleteAccount();

      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted. You will now be logged out.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      // Handle specific password verification errors
      if (error.message?.toLowerCase().includes('password')) {
        Alert.alert(
          'Incorrect Password',
          'The password you entered is incorrect. Account deletion cancelled.'
        );
      } else {
        Alert.alert(
          'Deletion Failed',
          error.message ||
            'Failed to delete account. Please try again or contact support.'
        );
      }
    }
  };

  return (
    <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm p-4">
      <Text className="text-lg font-semibold text-red-600 mb-4">
        Danger Zone
      </Text>

      <TouchableOpacity
        className="bg-red-50 border border-red-200 rounded-lg p-4"
        onPress={handleDeleteAccount}
      >
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="delete-forever"
            size={24}
            color="#EF4444"
          />
          <View className="ml-4 flex-1">
            <Text className="text-base font-semibold text-red-600">
              Delete Account
            </Text>
            <Text className="text-sm text-red-500">
              Permanently delete your account and all data
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#EF4444"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};
