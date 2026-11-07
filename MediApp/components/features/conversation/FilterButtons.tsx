import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface FilterTabsProps {
  activeFilter: 'all' | 'doctors' | 'patients';
  // eslint-disable-next-line no-unused-vars
  onFilterChange: (filter: 'all' | 'doctors' | 'patients') => void;
}

export const FilterButtons: React.FC<FilterTabsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const allScale = useSharedValue(1);
  const doctorsScale = useSharedValue(1);
  const patientsScale = useSharedValue(1);

  // Update scales when active filter changes
  React.useEffect(() => {
    allScale.value = withSpring(activeFilter === 'all' ? 1.05 : 1, {
      damping: 15,
      stiffness: 150,
    });
    doctorsScale.value = withSpring(activeFilter === 'doctors' ? 1.05 : 1, {
      damping: 15,
      stiffness: 150,
    });
    patientsScale.value = withSpring(activeFilter === 'patients' ? 1.05 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [activeFilter]);

  const allAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: allScale.value }],
  }));

  const doctorsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doctorsScale.value }],
  }));

  const patientsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: patientsScale.value }],
  }));

  return (
    <View className="py-3">
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        className="flex-row"
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {/* All Messages Button */}
        <Animated.View style={allAnimatedStyle}>
          <TouchableOpacity
            className={`mr-2 px-4 py-1.5 rounded-full ${
              activeFilter === 'all' ? 'bg-orange-500' : 'bg-gray-100'
            }`}
            onPress={() => {
              onFilterChange('all');
            }}
          >
            <Text
              className={`text-sm font-medium ${
                activeFilter === 'all' ? 'text-white' : 'text-gray-800'
              }`}
            >
              All Messages
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Doctors Button */}
        <Animated.View style={doctorsAnimatedStyle}>
          <TouchableOpacity
            className={`mr-2 px-4 py-1.5 rounded-full ${
              activeFilter === 'doctors' ? 'bg-orange-500' : 'bg-gray-100'
            }`}
            onPress={() => {
              onFilterChange('doctors');
            }}
          >
            <Text
              className={`text-sm font-medium ${
                activeFilter === 'doctors' ? 'text-white' : 'text-gray-800'
              }`}
            >
              Doctors
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Patients Button */}
        <Animated.View style={patientsAnimatedStyle}>
          <TouchableOpacity
            className={`px-4 py-1.5 rounded-full ${
              activeFilter === 'patients' ? 'bg-orange-500' : 'bg-gray-100'
            }`}
            onPress={() => {
              onFilterChange('patients');
            }}
          >
            <Text
              className={`text-sm font-medium ${
                activeFilter === 'patients' ? 'text-white' : 'text-gray-800'
              }`}
            >
              Patients
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};
