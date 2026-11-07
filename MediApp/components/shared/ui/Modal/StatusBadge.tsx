import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatusBadgeProps {
  label: string;
  icon: string;
  variant?: 'success' | 'warning' | 'info' | 'error' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  icon,
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-100',
          text: 'text-green-700',
          icon: '#10B981',
        };
      case 'warning':
        return {
          container: 'bg-orange-50 border-orange-100',
          text: 'text-orange-700',
          icon: '#EA580C',
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-100',
          text: 'text-blue-700',
          icon: '#2563EB',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-100',
          text: 'text-red-700',
          icon: '#EF4444',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-100',
          text: 'text-gray-700',
          icon: '#6B7280',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <View className={`rounded-2xl p-4 mb-3 border ${styles.container}`}>
      <View className="flex-row items-center">
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={styles.icon}
        />
        <Text className={`text-base font-semibold ml-3 ${styles.text}`}>
          {label}
        </Text>
      </View>
    </View>
  );
};
