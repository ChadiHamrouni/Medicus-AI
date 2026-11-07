import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { Card } from '@/components/shared/ui';

export type UserRole = 'patient' | 'doctor';

interface RoleCardProps {
  role: {
    id: UserRole;
    title: string;
    subtitle: string;
    icon: ImageSourcePropType;
    borderColor: string;
    features: string[];
    note?: string;
  };
  isSelected: boolean;
  onPress: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  isSelected,
  onPress,
}) => {
  return (
    <Card
      onPress={onPress}
      className={`w-full mb-4 ${isSelected ? 'border-[#F05C0C]' : 'border-gray-200'
        }`}
      style={{
        backgroundColor: isSelected ? '#FFF7ED' : '#FFFFFF',
        elevation: isSelected ? 3 : 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? 0.1 : 0.05,
        shadowRadius: isSelected ? 4 : 2,
      }}
      activeOpacity={0.8}
    >
      <View className="p-5">
        {/* Header with icon and title */}
        <View className="flex-row items-center mb-4">
          {/* Icon */}
          <View className="mr-4">
            <Image
              source={role.icon}
              style={{
                width: 46,
                height: 46,
                tintColor: '#F05C0C',
              }}
              resizeMode="contain"
            />
          </View>

          <View className="flex-1">
            <Text className="text-2xl font-normal text-gray-900">
              {role.title}
            </Text>
            <Text
              className={`text-base mt-1 ${isSelected ? 'text-gray-700' : 'text-gray-600'
                }`}
            >
              {role.subtitle}
            </Text>
          </View>

          {/* Selection indicator */}
          {isSelected && (
            <View
              className="ml-2 w-10 h-10 rounded-full items-center justify-center shadow-sm"
              style={{ backgroundColor: role.borderColor }}
            >
              <Text className="text-white text-xl font-bold">✓</Text>
            </View>
          )}
        </View>

        {/* Features list */}
        {/* <View className="space-y-2 mb-3"> */}
        {/* {role.features.map((feature, index) => (
            <View key={index} className="flex-row items-start">
              <View
                className="w-2 h-2 rounded-full mt-2.5 mr-3"
                style={{
                  backgroundColor: isSelected ? role.borderColor : '#9CA3AF',
                }}
              />
              <Text
                className={`text-sm flex-1 leading-5 ${isSelected ? 'text-gray-700 font-medium' : 'text-gray-600'
                  }`}
              >
                {feature}
              </Text>
            </View>
          ))} */}
        {/* </View> */}

        {/* Special note for doctors */}
        {/* {role.note && (
          <View className="p-3 rounded-lg mt-3 bg-gray-50 border border-gray-200">
            <Text className="text-sm leading-6 text-gray-600 font-medium">
              {role.note}
            </Text>
          </View>
        )} */}
      </View>
    </Card>
  );
};
