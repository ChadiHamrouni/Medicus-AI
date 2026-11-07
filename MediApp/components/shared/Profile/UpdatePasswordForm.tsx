import { PasswordField } from '@/components/shared/ui';
import {
  commonValidationRules,
  useAnimatedFormField,
  useChangePasswordMutation,
  useFormValidation,
  useLogoutMutation,
} from '@/hooks';
import { tokenStorage, logger } from '@/utils';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';

type FormFieldKey = 'oldPassword' | 'newPassword' | 'confirmPassword';

// Hook for password update logic
export const useUpdatePassword = () => {
  const router = useRouter();
  const changePasswordMutation = useChangePasswordMutation();
  const logoutMutation = useLogoutMutation();

  // Use form validation hook
  const { formData, errors, handleInputChange, validateForm } =
    useFormValidation<FormFieldKey>(
      { oldPassword: '', newPassword: '', confirmPassword: '' },
      {
        oldPassword: commonValidationRules.password,
        newPassword: commonValidationRules.password,
        confirmPassword: (value: string, formData?: Record<string, string>) => {
          if (!value) return 'Confirm password is required';
          if (formData && value !== formData.newPassword)
            return 'Passwords do not match';
          return null;
        },
      }
    );

  const handleLogoutAndRedirect = async () => {
    try {
      logger.info('Starting logout process after password change', {
        component: 'UpdatePasswordForm',
      });

      // Set a timeout as fallback to ensure redirect happens
      const timeoutId = setTimeout(() => {
        logger.warn('Logout timeout reached, forcing redirect', {
          component: 'UpdatePasswordForm',
        });
        router.replace('/(SignIn)/SignInScreen');
      }, 3000); // 3 second timeout

      // Try the proper logout first
      await logoutMutation.mutateAsync();

      // Clear timeout if logout succeeds
      clearTimeout(timeoutId);

      logger.info('Logout successful, redirecting to sign in', {
        component: 'UpdatePasswordForm',
      });
      router.replace('/(SignIn)/SignInScreen');
    } catch (error) {
      logger.error('Logout failed after password change', error as Error, {
        component: 'UpdatePasswordForm',
      });

      // Manual token cleanup as fallback
      try {
        await tokenStorage.clearTokens();
        logger.info('Manual token cleanup successful', {
          component: 'UpdatePasswordForm',
        });
      } catch (tokenError) {
        logger.error('Manual token cleanup also failed', tokenError as Error, {
          component: 'UpdatePasswordForm',
        });
      }

      // Always redirect regardless of what fails
      router.replace('/(SignIn)/SignInScreen');
    }
  };

  const handleUpdatePassword = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const response = await changePasswordMutation.mutateAsync({
        old_password: formData.oldPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });

      Alert.alert(
        'Success',
        response.message ||
          'Password updated successfully! You will be logged out for security.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Use setTimeout to ensure the Alert closes first, then handle logout
              setTimeout(() => {
                handleLogoutAndRedirect();
              }, 100);
            },
          },
        ],
        {
          cancelable: false, // Prevent dismissing without clicking OK
          onDismiss: () => {
            // Fallback if somehow the alert is dismissed
            setTimeout(() => {
              router.replace('/(SignIn)/SignInScreen');
            }, 500);
          },
        }
      );
    } catch (error) {
      let errorMessage = 'An error occurred during password update';

      if (error instanceof Error) {
        // Handle specific error messages from the API
        if (
          error.message.includes('incorrect') ||
          error.message.includes('invalid')
        ) {
          errorMessage = 'Current password is incorrect. Please try again.';
        } else if (
          error.message.includes('weak') ||
          error.message.includes('strength')
        ) {
          errorMessage = 'New password does not meet security requirements.';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert('Password Update Failed', errorMessage);
    }
  };

  return {
    formData,
    errors,
    handleInputChange,
    handleUpdatePassword,
    isUpdating: changePasswordMutation.isPending || logoutMutation.isPending,
  };
};

export const UpdatePasswordForm: React.FC = () => {
  const { formData, errors, handleInputChange } = useUpdatePassword();

  const formFields: FormFieldKey[] = [
    'oldPassword',
    'newPassword',
    'confirmPassword',
  ];
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields);

  return (
    <View className="px-4 w-full items-center">
      <View className="w-full max-w-md self-center">
        <View className="mb-6">
          <PasswordField
            field="oldPassword"
            value={formData.oldPassword}
            label="Old Password"
            isActive={selectedInput === 'oldPassword'}
            borderColor={
              errors.oldPassword ? '#EF4444' : getBorderColor('oldPassword')
            }
            labelStyle={getLabelStyle('oldPassword')}
            onFocus={() => handleFocus('oldPassword')}
            onBlur={() => handleBlur('oldPassword')}
            onChangeText={text => handleInputChange('oldPassword', text)}
            errorMessage={errors.oldPassword}
          />
        </View>

        <View className="mb-6">
          <PasswordField
            field="newPassword"
            value={formData.newPassword}
            label="New Password"
            isActive={selectedInput === 'newPassword'}
            borderColor={
              errors.newPassword ? '#EF4444' : getBorderColor('newPassword')
            }
            labelStyle={getLabelStyle('newPassword')}
            onFocus={() => handleFocus('newPassword')}
            onBlur={() => handleBlur('newPassword')}
            onChangeText={text => handleInputChange('newPassword', text)}
            errorMessage={errors.newPassword}
          />
        </View>
        <View className="mb-6">
          <PasswordField
            field="confirmPassword"
            value={formData.confirmPassword}
            label="Confirm Password"
            isActive={selectedInput === 'confirmPassword'}
            borderColor={
              errors.confirmPassword
                ? '#EF4444'
                : getBorderColor('confirmPassword')
            }
            labelStyle={getLabelStyle('confirmPassword')}
            onFocus={() => handleFocus('confirmPassword')}
            onBlur={() => handleBlur('confirmPassword')}
            onChangeText={text => handleInputChange('confirmPassword', text)}
            errorMessage={errors.confirmPassword}
          />
        </View>
      </View>
    </View>
  );
};
