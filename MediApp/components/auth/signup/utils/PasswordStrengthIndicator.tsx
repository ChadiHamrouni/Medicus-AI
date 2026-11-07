import React from 'react';
import { View, Text } from 'react-native';
import { getPasswordStrength } from '@/utils/validation';
import { PasswordRequirements } from './PasswordRequirements';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password }) => {
  if (!password) return null;

  const passwordStrength = getPasswordStrength(password);

  return (
    <>
      <View className="mt-2">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-sm text-gray-600">Password strength</Text>
          <Text
            className="text-sm font-medium"
            style={{ color: passwordStrength.color }}
          >
            {passwordStrength.text}
          </Text>
        </View>
        <View className="flex-row space-x-1">
          {[1, 2, 3, 4].map(level => (
            <View
              key={level}
              className="h-1 flex-1 rounded-full"
              style={{
                backgroundColor:
                  level <= passwordStrength.score
                    ? passwordStrength.color
                    : '#E5E7EB',
              }}
            />
          ))}
        </View>
      </View>

      {/* Password Requirements */}
      <PasswordRequirements password={password} />
    </>
  );
};
