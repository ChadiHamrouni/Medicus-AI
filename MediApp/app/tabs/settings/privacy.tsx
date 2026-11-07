import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: string;
}

const PrivacySettings: React.FC = () => {
  const router = useRouter();

  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: 'profile_visibility',
      title: 'Profile Visibility',
      description:
        'Allow healthcare providers to see your basic profile information',
      enabled: true,
      icon: 'account-eye',
    },
    {
      id: 'share_health_data',
      title: 'Health Data Sharing',
      description: 'Share anonymized health data for medical research',
      enabled: false,
      icon: 'chart-line',
    },
    {
      id: 'location_services',
      title: 'Location Services',
      description: 'Use location to find nearby healthcare providers',
      enabled: true,
      icon: 'map-marker',
    },
    {
      id: 'marketing_communications',
      title: 'Marketing Communications',
      description: 'Receive information about new features and health tips',
      enabled: false,
      icon: 'email-newsletter',
    },
    {
      id: 'usage_analytics',
      title: 'Usage Analytics',
      description: 'Help improve the app by sharing usage data',
      enabled: true,
      icon: 'chart-bar',
    },
  ]);

  const toggleSetting = (settingId: string) => {
    setPrivacySettings(prev =>
      prev.map(setting =>
        setting.id === settingId
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
  };

  const handleDataDownload = () => {};

  const handleDataDeletion = () => {};

  return (
    <StandardScreenLayout title="Privacy Settings" onBack={() => router.back()}>
      {/* Privacy Controls */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Privacy Controls
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Manage how your information is shared and used
          </Text>
        </View>

        {privacySettings.map((setting, index) => (
          <View key={setting.id}>
            <View className="flex-row items-center px-4 py-4">
              <View className="mr-4">
                <MaterialCommunityIcons
                  name={setting.icon as any}
                  size={24}
                  color="#F05C0C"
                />
              </View>

              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {setting.title}
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  {setting.description}
                </Text>
              </View>

              <Switch
                value={setting.enabled}
                onValueChange={() => toggleSetting(setting.id)}
                trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
                thumbColor={setting.enabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            {index < privacySettings.length - 1 && (
              <View className="h-px bg-gray-100 ml-16" />
            )}
          </View>
        ))}
      </View>

      {/* Data Rights */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Your Data Rights
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Control your personal data
          </Text>
        </View>

        <TouchableOpacity
          className="flex-row items-center px-4 py-4 border-b border-gray-100"
          onPress={handleDataDownload}
        >
          <View className="mr-4">
            <MaterialCommunityIcons name="download" size={24} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Download Your Data
            </Text>
            <Text className="text-sm text-gray-600">
              Get a copy of all your personal information
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center px-4 py-4"
          onPress={handleDataDeletion}
        >
          <View className="mr-4">
            <MaterialCommunityIcons
              name="delete-forever"
              size={24}
              color="#EF4444"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-red-600">
              Request Data Deletion
            </Text>
            <Text className="text-sm text-gray-600">
              Permanently delete your account and all data
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      </View>

      {/* Privacy Notice */}
      <View className="bg-blue-50 mx-4 mt-4 rounded-lg border border-blue-200 p-4">
        <View className="flex-row items-start">
          <MaterialCommunityIcons
            name="shield-account"
            size={22}
            color="#2563EB"
            className="mr-3 mt-0.5"
          />
          <View className="flex-1">
            <Text className="text-sm text-blue-900 font-medium">
              <Text className="font-semibold">Privacy commitment:</Text> We take
              your privacy seriously and will never sell your personal
              information to third parties. Read our full Privacy Policy for
              more details.
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom spacing */}
      <View className="h-8" />
    </StandardScreenLayout>
  );
};

export default PrivacySettings;
