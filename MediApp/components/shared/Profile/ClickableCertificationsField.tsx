import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

interface ClickableCertificationsFieldProps {
  value: string;
  label: string;
  isActive: boolean;
  borderColor: any; // Changed to any to match the type from getBorderColor
  labelStyle: any;
  onPress: () => void;
  certificationsCount: number;
}

export const ClickableCertificationsField: React.FC<
  ClickableCertificationsFieldProps
> = ({
  value,
  label,
  isActive,
  borderColor,
  labelStyle,
  onPress,
  certificationsCount,
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={{
          borderWidth: 1,
          borderColor: isActive ? '#F05C0C' : borderColor,
          borderRadius: 8,
          position: 'relative',
          minHeight: 60,
        }}
        className="bg-white"
      >
        <Animated.Text
          style={[labelStyle, { color: isActive ? '#F05C0C' : '#6B7280' }]}
          className="absolute top-2 left-3 text-sm bg-white px-1"
        >
          {label}
        </Animated.Text>

        <View className="flex-row items-center justify-between px-4 pt-6 pb-4 min-h-[60px]">
          <View className="flex-1">
            {certificationsCount === 0 ? (
              <View className="flex-row items-center">
                <MaterialIcons
                  name="add-circle-outline"
                  size={20}
                  color="#6B7280"
                  className="mr-2"
                />
                <Text className="text-gray-500 text-base">
                  Tap to add certifications
                </Text>
              </View>
            ) : (
              <View>
                <Text className="text-gray-900 text-base font-medium mb-1">
                  {certificationsCount} certification
                  {certificationsCount !== 1 ? 's' : ''} added
                </Text>
                <Text className="text-gray-600 text-sm" numberOfLines={2}>
                  {value || 'No certifications selected'}
                </Text>
              </View>
            )}
          </View>

          <View className="ml-3 flex-row items-center">
            <MaterialIcons
              name={certificationsCount === 0 ? 'add' : 'edit'}
              size={24}
              color={isActive ? '#F05C0C' : '#6B7280'}
            />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default ClickableCertificationsField;
