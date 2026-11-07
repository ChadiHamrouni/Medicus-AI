import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface TwoRowTabOption {
  key: string;
  label: string;
  icon: string;
}

export interface TwoRowTabsProps {
  tabsRow1: TwoRowTabOption[];
  tabsRow2: TwoRowTabOption[];
  activeKey: string;
  onTabChange: (_key: string) => void;
}

export const TwoRowTabs: React.FC<TwoRowTabsProps> = ({
  tabsRow1,
  tabsRow2,
  activeKey,
  onTabChange,
}) => {
  const TabButton: React.FC<{
    tab: TwoRowTabOption;
    isActive: boolean;
  }> = ({ tab, isActive }) => (
    <TouchableOpacity
      onPress={() => onTabChange(tab.key)}
      className="flex-1"
      activeOpacity={0.7}
    >
      <View
        className={`py-3 px-2 ${isActive ? 'border-b-2 border-orange-500' : ''}`}
      >
        <View className="items-center">
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={24}
            color={isActive ? '#F05C0C' : '#9CA3AF'}
          />
          <Text
            className={`text-md mt-1 font-medium ${isActive ? 'text-orange-600' : 'text-gray-500'}`}
            numberOfLines={1}
          >
            {tab.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="bg-white">
      {/* First Row */}
      <View className="flex-row">
        {tabsRow1.map(tab => (
          <TabButton key={tab.key} tab={tab} isActive={activeKey === tab.key} />
        ))}
      </View>
      {/* Second Row */}
      <View className="flex-row">
        {tabsRow2.map(tab => (
          <TabButton key={tab.key} tab={tab} isActive={activeKey === tab.key} />
        ))}
      </View>
    </View>
  );
};
