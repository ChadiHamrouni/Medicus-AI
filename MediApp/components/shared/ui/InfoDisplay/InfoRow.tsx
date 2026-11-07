import React from 'react';
import { View, Text } from 'react-native';

interface InfoRowProps {
  label: string;
  value?: string | number | null;
  defaultValue?: string;
  isLast?: boolean;
}

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  defaultValue = 'Not provided',
  isLast = false,
}) => {
  return (
    <View
      className={`flex-row justify-between items-center py-2 ${!isLast ? 'border-b border-gray-200' : ''}`}
    >
      <Text className="text-sm font-medium text-gray-600 flex-1">{label}</Text>
      <Text className="text-sm text-gray-800 flex-2 text-right">
        {value || defaultValue}
      </Text>
    </View>
  );
};
