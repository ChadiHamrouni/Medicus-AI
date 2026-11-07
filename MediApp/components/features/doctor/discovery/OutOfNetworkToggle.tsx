import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface OutOfNetworkToggleProps {
  showOutOfNetwork: boolean;
  outOfNetworkCount: number;
  onToggle: () => void;
  loading?: boolean;
}

export const OutOfNetworkToggle: React.FC<OutOfNetworkToggleProps> = ({
  showOutOfNetwork,
  outOfNetworkCount,
  onToggle,
  loading = false,
}) => {
  // Determine the display text based on state
  const getToggleText = () => {
    if (loading) {
      return 'Searching for out-of-network doctors...';
    }
    if (outOfNetworkCount === 0 && !showOutOfNetwork) {
      return 'Search Out-of-Network Doctors';
    }
    return `${showOutOfNetwork ? 'Hide' : 'Show'} Out-of-Network Doctors`;
  };

  const getSubText = () => {
    if (loading) {
      return 'Please wait...';
    }
    if (outOfNetworkCount === 0 && !showOutOfNetwork) {
      return 'Find doctors outside your network';
    }
    if (outOfNetworkCount === 0 && showOutOfNetwork) {
      return 'No out-of-network doctors found';
    }
    return `${outOfNetworkCount} additional doctor${outOfNetworkCount !== 1 ? 's' : ''} available`;
  };

  return (
    <View className="px-4 my-4">
      <TouchableOpacity
        onPress={onToggle}
        className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex-row items-center justify-between"
        activeOpacity={0.8}
        disabled={loading}
      >
        <View className="flex-row items-center flex-1">
          <MaterialCommunityIcons
            name="network-off"
            size={20}
            color="#F59E0B"
          />
          <View className="ml-3 flex-1">
            <Text className="text-base font-medium text-amber-900">
              {getToggleText()}
            </Text>
            <Text className="text-sm text-amber-700">
              {getSubText()}
            </Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#F59E0B" />
        ) : (
          <MaterialCommunityIcons
            name={showOutOfNetwork ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#F59E0B"
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default OutOfNetworkToggle;
