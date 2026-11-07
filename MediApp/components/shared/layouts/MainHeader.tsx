// Removed patient context imports - patient switching only in Settings
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export const MainHeader = ({
  title,
  showMenu = true,
  showFilter = false,
  showBackButton = false,
  onMenuPress,
  onFilterPress,
  onBackPress,
}: {
  title: string;
  showMenu?: boolean;
  showFilter?: boolean;
  showBackButton?: boolean;
  onMenuPress?: () => void;
  onFilterPress?: () => void;
  onBackPress?: () => void;
}) => {
  return (
    <View className="flex-col bg-white shadow-sm">
      {/* Main Header Row */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center flex-1">
          {showBackButton ? (
            <View className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100">
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#F05C0C"
                onPress={onBackPress}
              />
            </View>
          ) : (
            showMenu && (
              <View className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100">
                <MaterialCommunityIcons
                  name="menu"
                  size={24}
                  color="#F05C0C"
                  onPress={onMenuPress}
                />
              </View>
            )
          )}
          <Text
            className="text-2xl font-bold text-gray-900 flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right Side Controls */}
        <View className="flex-row items-center space-x-3">
          {/* Filter Button */}
          {showFilter && (
            <View className="p-2 rounded-full active:bg-gray-100">
              <MaterialCommunityIcons
                name="filter-variant"
                size={24}
                color="#F05C0C"
                onPress={onFilterPress}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
