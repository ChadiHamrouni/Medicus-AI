import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface InfoNoticeProps {
  title: string;
  message: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  iconBackgroundColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  titleColor?: string;
  textColor?: string;
}

export const InfoNotice: React.FC<InfoNoticeProps> = ({
  title,
  message,
  iconName = 'shield-check',
  iconColor = '#EA580C',
  iconBackgroundColor: _iconBackgroundColor = 'bg-orange-100',
  backgroundColor = 'bg-orange-50',
  borderColor = 'border-orange-200',
  titleColor = 'text-orange-900',
  textColor = 'text-orange-800',
}) => {
  return (
    <View
      className={`mt-6 p-5 ${backgroundColor} rounded-2xl border-2 ${borderColor} shadow-sm`}
    >
      <View className="flex-row items-start">
        <View className="mr-3 mt-0.5">
          <View className={`rounded-xl p-2`}>
            <MaterialCommunityIcons
              name={iconName}
              size={28}
              color={iconColor}
            />
          </View>
        </View>
        <View className="flex-1">
          <Text className={`text-base font-bold ${titleColor} mb-2`}>
            {title}
          </Text>
          <Text className={`text-sm ${textColor} leading-5`}>{message}</Text>
        </View>
      </View>
    </View>
  );
};
