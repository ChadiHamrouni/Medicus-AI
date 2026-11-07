import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';

interface StandardBottomButtonProps {
  onPress: () => void;
  label: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const StandardBottomButton: React.FC<StandardBottomButtonProps> = ({
  onPress,
  label,
  isLoading = false,
  isDisabled = false,
  variant = 'primary',
}) => {
  const isPrimary = variant === 'primary';

  const baseStyle = 'w-full rounded-lg py-4 items-center justify-center';
  const primaryStyle =
    isDisabled && !isLoading ? 'bg-gray-300' : 'bg-[#F05C0C]';
  const secondaryStyle = 'bg-white border border-gray-300'; // Example secondary style

  const buttonStyle = isPrimary ? primaryStyle : secondaryStyle;
  const opacityStyle = isLoading ? 'opacity-50' : '';

  const textBaseStyle = 'font-semibold text-base';
  const textPrimaryStyle =
    isDisabled && !isLoading ? 'text-gray-500' : 'text-white';
  const textSecondaryStyle = 'text-gray-700';

  const textStyle = isPrimary ? textPrimaryStyle : textSecondaryStyle;

  return (
    <TouchableOpacity
      className={`${baseStyle} ${buttonStyle} ${opacityStyle}`}
      onPress={onPress}
      disabled={isDisabled || isLoading}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center">
        <Text className={`${textBaseStyle} ${textStyle}`}>
          {isLoading ? 'Processing...' : label}
        </Text>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={isPrimary ? '#FFFFFF' : '#F05C0C'}
            className="ml-2"
          />
        )}
      </View>
    </TouchableOpacity>
  );
};
