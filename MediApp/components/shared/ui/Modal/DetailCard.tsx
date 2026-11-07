import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DetailCardRowProps {
  icon: string;
  label: string;
  value: string | React.ReactNode;
  subtitle?: string;
  onPress?: () => void;
  showDivider?: boolean;
}

export const DetailCardRow: React.FC<DetailCardRowProps> = ({
  icon,
  label: _label,
  value,
  subtitle,
  onPress,
  showDivider: _showDivider = true,
}) => {
  const content = (
    <>
      {/* {showDivider && <View className="h-px bg-gray-100 my-1" />} */}
      <View className="flex-row items-center py-3">
        <MaterialCommunityIcons name={icon as any} size={20} color="#F05C0C" />
        <View className="flex-1 ml-3">
          {/* <Text className="text-lg text-gray-500 mb-0.5">{label}</Text> */}
          {typeof value === 'string' ? (
            <Text
              className={`text-base font-medium ${
                onPress ? 'text-orange-600 underline' : 'text-gray-900'
              }`}
            >
              {value}
            </Text>
          ) : (
            value
          )}
          {subtitle && (
            <Text className="text-sm text-gray-600 mt-0.5">{subtitle}</Text>
          )}
        </View>
        {onPress && (
          <MaterialCommunityIcons
            name="open-in-new"
            size={18}
            color="#F05C0C"
          />
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

interface DetailCardProps {
  children: React.ReactNode;
  className?: string;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  children,
  className = '',
}) => {
  return (
    <View
      className={`bg-white rounded-2xl p-4 mb-3 border border-gray-100 ${className}`}
    >
      {children}
    </View>
  );
};
