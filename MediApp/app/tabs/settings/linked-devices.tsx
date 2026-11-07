import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Device {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  lastActive: string;
  location: string;
  isCurrent: boolean;
}

const MOCK_DEVICES: Device[] = [
  {
    id: '1',
    name: 'iPhone 14',
    type: 'mobile',
    lastActive: 'Active now',
    location: 'New York, NY',
    isCurrent: true,
  },
  {
    id: '2',
    name: 'MacBook Pro',
    type: 'desktop',
    lastActive: '2 hours ago',
    location: 'New York, NY',
    isCurrent: false,
  },
  {
    id: '3',
    name: 'iPad Air',
    type: 'tablet',
    lastActive: '1 day ago',
    location: 'New York, NY',
    isCurrent: false,
  },
];

const LinkedDevicesSettings: React.FC = () => {
  const router = useRouter();

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'mobile':
        return 'cellphone';
      case 'desktop':
        return 'laptop';
      case 'tablet':
        return 'tablet';
      default:
        return 'devices';
    }
  };

  const handleSignOutDevice = (deviceId: string) => {};

  const handleSignOutAllDevices = () => {};

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#374151"
            />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">
            Linked Devices
          </Text>
        </View>

        <ScrollView className="flex-1">
          {/* Info Section */}
          <View className="bg-blue-50 mx-4 mt-4 rounded-lg border border-blue-200 p-4">
            <View className="flex-row items-start">
              <MaterialCommunityIcons
                name="information"
                size={22}
                color="#2563EB"
                className="mr-3 mt-0.5"
              />
              <View className="flex-1">
                <Text className="text-sm text-blue-900 font-medium">
                  These are all the devices where you're currently signed in to
                  MediApp.
                </Text>
              </View>
            </View>
          </View>

          {/* Current Devices */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <View className="p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                Your Devices
              </Text>
            </View>

            {MOCK_DEVICES.map((device, index) => (
              <View key={device.id}>
                <View className="flex-row items-center px-4 py-4">
                  <View className="mr-4">
                    <MaterialCommunityIcons
                      name={getDeviceIcon(device.type)}
                      size={32}
                      color="#F05C0C"
                    />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-semibold text-gray-900">
                        {device.name}
                      </Text>
                      {device.isCurrent && (
                        <View className="ml-2 bg-green-100 rounded-full px-3 py-1 border border-green-300">
                          <Text className="text-green-700 text-xs font-semibold">
                            Current Device
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-gray-600 mt-1">
                      {device.lastActive} • {device.location}
                    </Text>
                  </View>

                  {!device.isCurrent && (
                    <TouchableOpacity
                      onPress={() => handleSignOutDevice(device.id)}
                      className="ml-2 p-2"
                    >
                      <MaterialCommunityIcons
                        name="logout"
                        size={20}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {index < MOCK_DEVICES.length - 1 && (
                  <View className="h-px bg-gray-100 ml-16" />
                )}
              </View>
            ))}
          </View>

          {/* Actions */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <TouchableOpacity
              className="flex-row items-center px-4 py-4"
              onPress={handleSignOutAllDevices}
            >
              <View className="mr-4">
                <MaterialCommunityIcons
                  name="logout-variant"
                  size={24}
                  color="#EF4444"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-red-600">
                  Sign Out All Other Devices
                </Text>
                <Text className="text-sm text-gray-600">
                  Keep only this device signed in
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View className="bg-amber-50 mx-4 mt-4 mb-4 rounded-lg border border-amber-200 p-4">
            <View className="flex-row items-start">
              <MaterialCommunityIcons
                name="shield-alert"
                size={22}
                color="#D97706"
                className="mr-3 mt-0.5"
              />
              <View className="flex-1">
                <Text className="text-sm text-amber-800 font-medium">
                  <Text className="font-semibold">Security tip:</Text> If you
                  see a device you don't recognize, sign it out immediately and
                  consider changing your password.
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default LinkedDevicesSettings;
