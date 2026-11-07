import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface TabOption {
  key: string;
  label: string;
  count?: number;
}

interface TabBarProps {
  options: TabOption[];
  activeKey: string;
  // eslint-disable-next-line no-unused-vars
  onTabChange: (key: string) => void;
  variant?: 'default' | 'compact';
}

export const TabBar: React.FC<TabBarProps> = ({
  options,
  activeKey,
  onTabChange,
  variant = 'default',
}) => {
  const isCompact = variant === 'compact';

  return (
    <View className="bg-white border-b border-gray-200">
      <View className={`flex-row ${isCompact ? 'px-2' : 'px-4'}`}>
        {options.map(option => {
          const isActive = activeKey === option.key;

          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onTabChange(option.key)}
              className={`flex-1 ${isCompact ? 'py-3' : 'py-4'} border-b-2`}
              style={{
                borderBottomColor: isActive ? '#EA580C' : 'transparent',
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-center">
                <Text
                  className={`text-base font-semibold ${
                    isActive ? 'text-orange-600' : 'text-gray-500'
                  }`}
                >
                  {option.label}
                </Text>
                {option.count !== undefined && option.count >= 0 && (
                  <View
                    className={`ml-2 px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-orange-100' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isActive ? 'text-orange-600' : 'text-gray-600'
                      }`}
                    >
                      {option.count}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
