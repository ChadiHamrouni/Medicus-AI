import { FormField } from '@/components/shared/ui/Form/FormField';
import React, { useState, useEffect } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

interface PasswordChangeProps {
  onPasswordChange: (_data: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<void>;
  isUpdating: boolean;
}

export const PasswordChange: React.FC<PasswordChangeProps> = ({
  onPasswordChange,
  isUpdating,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasPasswordChanges, setHasPasswordChanges] = useState(false);

  // const formFields = ['currentPassword', 'newPassword', 'confirmPassword'];

  // const {
  //   selectedInput: _selectedInput,
  //   getBorderColor: _getBorderColor,
  //   getLabelStyle: _getLabelStyle,
  //   handleFocus: _handleFocus,
  //   handleBlur: _handleBlur,
  // } = useAnimatedFormField(formFields, 'white');
  // Removing complete logic since it is unused.

  // Also remove hook import if possible?
  // I will just remove the lines.

  // Track if password has been entered
  useEffect(() => {
    setHasPasswordChanges(
      currentPassword.length > 0 ||
        newPassword.length > 0 ||
        confirmPassword.length > 0
    );
  }, [currentPassword, newPassword, confirmPassword]);

  const handlePasswordUpdate = async () => {
    try {
      // Validate password fields
      if (!currentPassword) {
        Alert.alert('Error', 'Current password is required to change password');
        return;
      }

      if (!newPassword) {
        Alert.alert('Error', 'New password is required');
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        Alert.alert('Error', 'New password must be at least 8 characters long');
        return;
      }

      // Update password
      await onPasswordChange({
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      // Clear password fields after successful change
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Success', 'Password updated successfully!');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to update password. Please try again.'
      );
    }
  };

  return (
    <>
      {/* Change Password */}
      <View className="bg-white mx-4 mt-4 rounded-lg border-b border-gray-200 p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-6">
          Change Password
        </Text>

        <View>
          <View className="mb-6">
            <FormField
              type="text"
              field="currentPassword"
              value={currentPassword}
              label="Current Password"
              onChangeText={setCurrentPassword}
              secureTextEntry
              backgroundColor="white"
            />
          </View>

          <View className="mb-6">
            <FormField
              type="text"
              field="newPassword"
              value={newPassword}
              label="New Password"
              onChangeText={setNewPassword}
              secureTextEntry
              backgroundColor="white"
            />
          </View>

          <View className="mb-2">
            <FormField
              type="text"
              field="confirmPassword"
              value={confirmPassword}
              label="Confirm New Password"
              onChangeText={setConfirmPassword}
              secureTextEntry
              backgroundColor="white"
            />
          </View>
        </View>
      </View>

      {/* Save Password Button - Only for password changes */}
      {hasPasswordChanges && (
        <View className="mx-4 mt-6">
          <TouchableOpacity
            className={`w-full rounded-lg py-4 items-center justify-center ${
              hasPasswordChanges && !isUpdating ? 'bg-[#F05C0C]' : 'bg-gray-300'
            }`}
            onPress={handlePasswordUpdate}
            activeOpacity={0.8}
            disabled={!hasPasswordChanges || isUpdating}
          >
            <Text
              className={`font-semibold text-base ${
                hasPasswordChanges && !isUpdating
                  ? 'text-white'
                  : 'text-gray-500'
              }`}
            >
              {isUpdating ? 'Updating Password...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};
