import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface MedicationsTabsProps {
  activeTab: 'current' | 'previous';
  onTabChange: (_tab: 'current' | 'previous') => void;
  currentCount: number;
  previousCount: number;
}

export const MedicationsTabs: React.FC<MedicationsTabsProps> = ({
  activeTab,
  onTabChange,
  currentCount,
  previousCount,
}) => {
  return (
    <View className="bg-white border-b border-gray-200">
      <View className="flex-row px-4">
        {/* Current Tab */}
        <TouchableOpacity
          onPress={() => onTabChange('current')}
          className="flex-1 py-4 border-b-2"
          style={{
            borderBottomColor:
              activeTab === 'current' ? '#EA580C' : 'transparent',
          }}
        >
          <View className="flex-row items-center justify-center space-x-2">
            <Text
              className={`text-base font-semibold ${
                activeTab === 'current' ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              Current
            </Text>
            {currentCount > 0 && (
              <View
                className={`px-2 py-0.5 rounded-full ${
                  activeTab === 'current' ? 'bg-orange-100' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    activeTab === 'current'
                      ? 'text-orange-600'
                      : 'text-gray-600'
                  }`}
                >
                  {currentCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Previous Tab */}
        <TouchableOpacity
          onPress={() => onTabChange('previous')}
          className="flex-1 py-4 border-b-2"
          style={{
            borderBottomColor:
              activeTab === 'previous' ? '#EA580C' : 'transparent',
          }}
        >
          <View className="flex-row items-center justify-center space-x-2">
            <Text
              className={`text-base font-semibold ${
                activeTab === 'previous' ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              Previous
            </Text>
            {previousCount > 0 && (
              <View
                className={`px-2 py-0.5 rounded-full ${
                  activeTab === 'previous' ? 'bg-orange-100' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    activeTab === 'previous'
                      ? 'text-orange-600'
                      : 'text-gray-600'
                  }`}
                >
                  {previousCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
