import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import DoctorCard from './DoctorCard';

interface OutOfNetworkSectionProps {
  doctors: any[];
  loading: boolean;
  hasMore: boolean;
  showButton: boolean;
  expandedDoctorId: string | null;
  onLoad: () => void;
  onLoadMore: () => void;
  onDoctorSelect: (doctor: any) => void;
}

const AnimatedSpinner = ({
  size = 20,
  color = '#F05C0C',
}: {
  size?: number;
  color?: string;
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        borderColor: color,
        borderTopColor: 'transparent',
        borderRadius: size / 2,
        transform: [{ rotate: spin }],
      }}
    />
  );
};

export const OutOfNetworkSection: React.FC<OutOfNetworkSectionProps> = ({
  doctors,
  loading,
  hasMore,
  showButton,
  expandedDoctorId,
  onLoad,
  onLoadMore,
  onDoctorSelect,
}) => {
  // Show load button when no out-of-network doctors are loaded but button should be visible
  if (showButton && doctors.length === 0) {
    return (
      <View className="mt-6">
        <TouchableOpacity
          onPress={onLoad}
          disabled={loading}
          className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex-row items-center justify-between"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="network-off"
              size={20}
              color="#F59E0B"
            />
            <View className="ml-3">
              <Text className="text-base font-medium text-amber-900">
                {loading ? 'Loading...' : 'Show Out-of-Network Doctors'}
              </Text>
              <Text className="text-sm text-amber-700">
                {loading
                  ? 'Searching for additional options'
                  : 'Additional doctors outside our network'}
              </Text>
            </View>
          </View>
          {loading ? (
            <AnimatedSpinner size={20} color="#F59E0B" />
          ) : (
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#F59E0B"
            />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Show out-of-network doctors section
  if (doctors.length > 0) {
    return (
      <>
        <View className="my-6">
          <View className="flex-row items-center">
            <View className="flex-1 h-px bg-amber-300" />
            <Text className="px-4 text-sm font-medium text-amber-700">
              Out-of-Network ({doctors.length})
            </Text>
            <View className="flex-1 h-px bg-amber-300" />
          </View>
        </View>

        {doctors.map(doctor => (
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            isExpanded={expandedDoctorId === doctor.id.toString()}
            onSelect={onDoctorSelect}
          />
        ))}

        {/* Load More Out-of-Network Button */}
        {hasMore && (
          <TouchableOpacity
            onPress={onLoadMore}
            disabled={loading}
            className="bg-amber-50 rounded-2xl p-4 mt-4 items-center border border-amber-200"
          >
            <Text className="text-amber-700 font-medium">
              {loading ? 'Loading...' : 'Load More Out-of-Network Doctors'}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  }

  return null;
};

export default OutOfNetworkSection;
