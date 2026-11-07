import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Button, FormFieldWrapper } from '@/components/shared/ui';
import { PasswordRequirements } from '@/components/auth/signup';

interface ResetPasswordFormProps {
  code: string;
  newPassword: string;
  confirmPassword: string;
  errors: {
    code: string | null;
    newPassword: string | null;
    confirmPassword: string | null;
  };
  isSubmitting: boolean;
  selectedInput: string;
  getBorderColor: (field: string) => any;
  getLabelStyle: (field: string) => any;
  onCodeChange: (text: string) => void;
  onNewPasswordChange: (text: string) => void;
  onConfirmPasswordChange: (text: string) => void;
  onFocus: (field: string) => void;
  onBlur: (field: string) => void;
  onSubmit: () => void;
  onBackToEmail: () => void;
  onResendCode: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  code,
  newPassword,
  confirmPassword,
  errors,
  isSubmitting,
  selectedInput,
  getBorderColor,
  getLabelStyle,
  onCodeChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onFocus,
  onBlur,
  onSubmit,
  onBackToEmail,
  onResendCode,
}) => {
  return (
    <>
      {/* Reset Form */}
      <View className="mt-2">
        <View className="mb-6">
          <FormFieldWrapper
            type="text"
            field="code"
            value={code}
            label="Verification Code"
            isActive={selectedInput === 'code'}
            borderColor={errors.code ? '#EF4444' : getBorderColor('code')}
            labelStyle={getLabelStyle('code')}
            onFocus={() => onFocus('code')}
            onBlur={() => onBlur('code')}
            onChangeText={onCodeChange}
            keyboardType="numeric"
            errorMessage={errors.code || undefined}
          />
        </View>

        <View className="mb-6">
          <FormFieldWrapper
            type="text"
            field="newPassword"
            value={newPassword}
            label="New Password"
            isActive={selectedInput === 'newPassword'}
            borderColor={
              errors.newPassword ? '#EF4444' : getBorderColor('newPassword')
            }
            labelStyle={getLabelStyle('newPassword')}
            onFocus={() => onFocus('newPassword')}
            onBlur={() => onBlur('newPassword')}
            onChangeText={onNewPasswordChange}
            secureTextEntry={true}
            errorMessage={errors.newPassword || undefined}
          />
        </View>

        <View className="mb-6">
          <FormFieldWrapper
            type="text"
            field="confirmPassword"
            value={confirmPassword}
            label="Confirm New Password"
            isActive={selectedInput === 'confirmPassword'}
            borderColor={
              errors.confirmPassword
                ? '#EF4444'
                : getBorderColor('confirmPassword')
            }
            labelStyle={getLabelStyle('confirmPassword')}
            onFocus={() => onFocus('confirmPassword')}
            onBlur={() => onBlur('confirmPassword')}
            onChangeText={onConfirmPasswordChange}
            secureTextEntry={true}
            errorMessage={errors.confirmPassword || undefined}
          />
        </View>
      </View>

      {/* Password Requirements */}
      <PasswordRequirements password={newPassword} />

      {/* Reset Buttons */}
      <View className="mt-8">
        <Button
          title={isSubmitting ? 'Resetting...' : 'Reset Password'}
          onPress={onSubmit}
          disabled={isSubmitting}
          containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-4 py-4"
          textClassName="text-white font-semibold text-base"
        />

        <Button
          title="Back to Email"
          onPress={onBackToEmail}
          containerClassName="bg-white w-full h-16 border border-gray-300 rounded-lg flex-row items-center justify-center py-4"
          textClassName="text-gray-700 font-semibold text-base"
          disabled={isSubmitting}
        />
      </View>

      {/* Resend Code Link */}
      <TouchableOpacity
        onPress={onResendCode}
        className="mt-6"
        disabled={isSubmitting}
      >
        <Text className="text-center text-blue-600 font-medium text-base">
          Didn&apos;t receive the code? Resend Code
        </Text>
      </TouchableOpacity>
    </>
  );
};

export default ResetPasswordForm;
