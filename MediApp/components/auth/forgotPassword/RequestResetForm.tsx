import React from 'react';
import { View } from 'react-native';
import { Button, FormFieldWrapper } from '@/components/shared/ui';

interface RequestResetFormProps {
  email: string;
  emailError: string | null;
  isSubmitting: boolean;
  isActive: boolean;
  borderColor: string | any;
  labelStyle: any;
  onEmailChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

const RequestResetForm: React.FC<RequestResetFormProps> = ({
  email,
  emailError,
  isSubmitting,
  isActive,
  borderColor,
  labelStyle,
  onEmailChange,
  onFocus,
  onBlur,
  onSubmit,
  onBack,
}) => {
  return (
    <>
      {/* Form */}
      <View className="mt-2 mb-6">
        <FormFieldWrapper
          type="text"
          field="email"
          value={email}
          label="Email Address"
          isActive={isActive}
          borderColor={emailError ? '#EF4444' : borderColor}
          labelStyle={labelStyle}
          onFocus={onFocus}
          onBlur={onBlur}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          errorMessage={emailError || undefined}
        />
      </View>

      {/* Buttons */}
      <View className="mt-8">
        <Button
          title={isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
          onPress={onSubmit}
          disabled={isSubmitting}
          containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-4 py-4"
          textClassName="text-white font-semibold text-base"
        />

        <Button
          title="Back to Sign In"
          onPress={onBack}
          containerClassName="bg-white w-full h-16 border border-gray-300 rounded-lg flex-row items-center justify-center py-4"
          textClassName="text-gray-700 font-semibold text-base"
          disabled={isSubmitting}
        />
      </View>
    </>
  );
};

export default RequestResetForm;
