import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import { env } from '@/utils/infrastructure/env';

const AboutSettings: React.FC = () => {
  const router = useRouter();

  // Links come from EXPO_PUBLIC_* variables (utils/infrastructure/env.ts); unset ones are hidden.
  const appVersion = env.appVersion;
  const storeUrl = Platform.OS === 'ios' ? env.appStoreUrl : env.playStoreUrl;
  const open = (url?: string) => () => url && Linking.openURL(url);

  const handleOpenTerms = open(env.termsUrl);
  const handleOpenPrivacyPolicy = open(env.privacyUrl);

  const handleOpenLicenses = () => {};

  const handleOpenWebsite = open(env.websiteUrl);
  const handleContactSupport = open(env.supportEmail && `mailto:${env.supportEmail}?subject=Medicus`);
  const handleRateApp = open(storeUrl);

  const aboutItems = [
    {
      title: 'Terms of Service',
      description: 'Read our terms and conditions',
      icon: 'file-document-outline',
      onPress: handleOpenTerms,
      disabled: !env.termsUrl,
    },
    {
      title: 'Privacy Policy',
      description: 'How we protect and use your data',
      icon: 'shield-account',
      onPress: handleOpenPrivacyPolicy,
      disabled: !env.privacyUrl,
    },
    {
      title: 'Third-party Licenses',
      description: 'Open source libraries and licenses',
      icon: 'license',
      onPress: handleOpenLicenses,
      disabled: true,
    },
    {
      title: 'Visit Our Website',
      description: 'Learn more about Medicus',
      icon: 'web',
      onPress: handleOpenWebsite,
      disabled: !env.websiteUrl,
    },
    {
      title: 'Rate This App',
      description: 'Help us improve by leaving a review',
      icon: 'star',
      onPress: handleRateApp,
      disabled: !storeUrl,
    },
    {
      title: 'Contact Support',
      description: 'Get help or report issues',
      icon: 'email',
      onPress: handleContactSupport,
      disabled: !env.supportEmail,
    },
  ];

  const features = [
    'Secure messaging with healthcare providers',
    'Health record management and storage',
    'Appointment scheduling and reminders',
    'Family member health tracking',
    'Document sharing and storage',
    'Emergency contact management',
    'Multi-device synchronization',
    'End-to-end encryption for privacy',
  ];

  return (
    <StandardScreenLayout title="About" onBack={() => router.back()}>
      <View className="bg-gray-50">
        {/* App Info */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm p-6">
          <View className="items-center">
            <View className="w-32 h-32 bg-white rounded-2xl items-center justify-center mb-4 shadow-sm">
              <Image
                source={require('@/assets/images/taskify.png')}
                className="w-28 h-28"
                resizeMode="contain"
              />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              Medicus
            </Text>
            <Text className="text-base text-gray-600 mb-4 text-center">
              Your comprehensive healthcare companion
            </Text>

            <View className="bg-gray-50 rounded-lg p-4 w-full">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm text-gray-600">Version</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {appVersion}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* What's New */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              What's New
            </Text>
          </View>
          <View className="p-4">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons
                name="new-box"
                size={20}
                color="#10B981"
                className="mr-3"
              />
              <Text className="text-sm text-gray-700 flex-1">
                Enhanced security with biometric authentication
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons
                name="new-box"
                size={20}
                color="#10B981"
                className="mr-3"
              />
              <Text className="text-sm text-gray-700 flex-1">
                Improved messaging interface with rich text support
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons
                name="new-box"
                size={20}
                color="#10B981"
                className="mr-3"
              />
              <Text className="text-sm text-gray-700 flex-1">
                Family member management and sharing features
              </Text>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="new-box"
                size={20}
                color="#10B981"
                className="mr-3"
              />
              <Text className="text-sm text-gray-700 flex-1">
                Performance improvements and bug fixes
              </Text>
            </View>
          </View>
        </View>

        {/* Key Features */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Key Features
            </Text>
          </View>
          <View className="p-4">
            {features.map((feature, index) => (
              <View key={index} className="flex-row items-start mb-2">
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color="#F05C0C"
                  className="mr-3 mt-0.5"
                />
                <Text className="text-sm text-gray-700 flex-1">{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Legal & Support */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Legal & Support
            </Text>
          </View>

          {aboutItems.filter(item => !item.disabled).map((item, index) => (
            <Pressable
              key={item.title}
              className={`flex-row items-center px-4 py-4 ${item.disabled ? 'opacity-50' : ''}`}
              onPress={item.disabled ? undefined : item.onPress}
              disabled={item.disabled}
              style={({ pressed }) => [
                !item.disabled && pressed && { opacity: 0.7 },
              ]}
            >
              <View className="mr-4">
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={item.disabled ? '#9CA3AF' : '#F05C0C'}
                />
              </View>

              <View className="flex-1">
                <Text
                  className={`text-base font-semibold ${item.disabled ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  {item.title}
                  {item.disabled && (
                    <Text className="text-xs text-gray-400 font-normal">
                      {' '}
                      (Coming Soon)
                    </Text>
                  )}
                </Text>
                <Text
                  className={`text-sm ${item.disabled ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {item.description}
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={item.disabled ? '#D1D5DB' : '#9CA3AF'}
              />

              {index < aboutItems.length - 1 && (
                <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
              )}
            </Pressable>
          ))}
        </View>

        {/* Company Info */}
        <View className="bg-blue-50 mx-4 mt-4 rounded-lg border border-blue-200 p-4">
          <View className="flex-row items-start">
            <MaterialCommunityIcons
              size={22}
              color="#F05C0C"
              className="mt-0.5"
            />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-blue-900 mb-2 text-center">
                © 2025 MedicusAI
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </StandardScreenLayout>
  );
};

export default AboutSettings;
