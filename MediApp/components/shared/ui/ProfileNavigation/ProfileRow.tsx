import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export type CompletionStatus = 'complete' | 'incomplete' | 'pending';

interface ProfileRowProps {
  title: string;
  description?: string;
  href?: string;
  icon: string;
  isLast?: boolean;
  completionStatus?: CompletionStatus;
  badge?: number;
  disabled?: boolean;
  showComingSoon?: boolean;
  onPress?: () => void;
  iconSize?: number;
  iconColor?: string;
}

export const ProfileRow: React.FC<ProfileRowProps> = ({
  title,
  description,
  href,
  icon,
  isLast = false,
  completionStatus,
  badge,
  disabled = false,
  showComingSoon = false,
  onPress,
  iconSize = 28,
  iconColor,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (disabled) return;

    if (onPress) {
      onPress();
    } else if (href) {
      router.push(href as any);
    }
  };

  const getStatusIcon = () => {
    if (!completionStatus) return null;

    const iconMap = {
      complete: (
        <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
      ),
      incomplete: (
        <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
      ),
      pending: (
        <MaterialCommunityIcons name="clock" size={20} color="#F59E0B" />
      ),
    };

    return iconMap[completionStatus];
  };

  const effectiveIconColor = disabled ? '#9CA3AF' : iconColor || '#F05C0C';

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`flex-row items-center px-4 py-4 ${disabled ? 'opacity-50' : ''}`}
      style={({ pressed }) => [!disabled && pressed && { opacity: 0.7 }]}
    >
      {/* Section Icon */}
      <View className="mr-4">
        <MaterialCommunityIcons
          name={icon as any}
          size={iconSize}
          color={effectiveIconColor}
        />
      </View>

      {/* Section Content */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className={`text-base font-normal ${disabled ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {title}
            {showComingSoon && disabled && (
              <Text className="text-xs text-gray-400 font-normal">
                {' '}
                (Coming Soon)
              </Text>
            )}
          </Text>
          <View className="flex-row items-center">
            {/* Badge */}
            {badge !== null &&
              badge !== undefined &&
              badge > 0 &&
              !disabled && (
                <View className="bg-[#F05C0C] rounded-full min-w-5 h-5 items-center justify-center mr-2">
                  <Text className="text-white text-xs font-semibold">
                    {badge}
                  </Text>
                </View>
              )}
            {/* Status Icon */}
            {getStatusIcon()}
          </View>
        </View>
        {description && (
          <Text
            className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {description}
          </Text>
        )}
      </View>

      {/* Arrow */}
      <View className="ml-2">
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={disabled ? '#D1D5DB' : '#9CA3AF'}
        />
      </View>
    </Pressable>
  );
};
