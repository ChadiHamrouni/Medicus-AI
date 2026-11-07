import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import { InfoNotice } from '@/components/shared/ui';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
}

const HelpSettings: React.FC = () => {
  const router = useRouter();

  const handleContactSupport = () => {
    Linking.openURL(
      'mailto:support@mediapp.com?subject=MediApp Support Request'
    );
  };

  const handlePhoneSupport = () => {
    Linking.openURL('tel:+1-555-000-0000'); // Placeholder number
  };

  const handleLiveChat = () => {};

  const handleViewFAQs = () => {};

  const helpItems: HelpItem[] = [
    {
      id: 'faqs',
      title: 'Frequently Asked Questions',
      description: 'Find answers to common questions',
      icon: 'help-circle',
      action: handleViewFAQs,
    },
    {
      id: 'email_support',
      title: 'Email Support',
      description: 'Send us a detailed message',
      icon: 'email',
      action: handleContactSupport,
    },
    {
      id: 'phone_support',
      title: 'Phone Support',
      description: 'Call our support team (Mon-Fri, 9am-5pm EST)',
      icon: 'phone',
      action: handlePhoneSupport,
    },
    {
      id: 'live_chat',
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      icon: 'chat',
      action: handleLiveChat,
    },
  ];

  const quickGuides = [
    { title: 'Getting Started with MediApp', icon: 'rocket-launch' },
    { title: 'Managing Your Health Records', icon: 'folder-heart' },
    { title: 'Scheduling Appointments', icon: 'calendar-clock' },
    { title: 'Video Consultations Guide', icon: 'video' },
    { title: 'Privacy and Security', icon: 'shield-account' },
    { title: 'Troubleshooting Common Issues', icon: 'tools' },
  ];

  return (
    <StandardScreenLayout title="Help & Support" onBack={() => router.back()}>
      <View className="bg-gray-50">
        {/* Quick Support */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Get Help
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Choose how you'd like to get support
            </Text>
          </View>

          {helpItems.map((item, index) => {
            const isDisabled = item.id === 'live_chat';

            return (
              <Pressable
                key={item.id}
                className={`flex-row items-center px-4 py-4 ${isDisabled ? 'opacity-50' : ''}`}
                onPress={isDisabled ? undefined : item.action}
                disabled={isDisabled}
                style={({ pressed }) => [
                  !isDisabled && pressed && { opacity: 0.7 },
                ]}
              >
                <View className="mr-4">
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={24}
                    color={isDisabled ? '#9CA3AF' : '#F05C0C'}
                  />
                </View>

                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}
                  >
                    {item.title}
                    {isDisabled && (
                      <Text className="text-xs text-gray-400 font-normal">
                        {' '}
                        (Coming Soon)
                      </Text>
                    )}
                  </Text>
                  <Text
                    className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {item.description}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={isDisabled ? '#D1D5DB' : '#9CA3AF'}
                />

                {index < helpItems.length - 1 && (
                  <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Quick Guides */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <View className="p-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Quick Guides
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Step-by-step tutorials and guides
            </Text>
          </View>

          {quickGuides.map((guide, index) => (
            <Pressable
              key={guide.title}
              className="flex-row items-center px-4 py-4 opacity-50"
              onPress={undefined}
              disabled={true}
            >
              <View className="mr-4">
                <MaterialCommunityIcons
                  name={guide.icon as any}
                  size={24}
                  color="#9CA3AF"
                />
              </View>

              <Text className="flex-1 text-base text-gray-400">
                {guide.title}
                <Text className="text-xs text-gray-400 font-normal">
                  {' '}
                  (Coming Soon)
                </Text>
              </Text>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#D1D5DB"
              />

              {index < quickGuides.length - 1 && (
                <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
              )}
            </Pressable>
          ))}
        </View>

        {/* System Status */}
        <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
          <Pressable
            className="flex-row items-center px-4 py-4"
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <View className="mr-4">
              <MaterialCommunityIcons name="server" size={24} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                System Status
              </Text>
              <View className="flex-row items-center mt-1">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-sm text-gray-600">
                  All systems operational
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#9CA3AF"
            />
          </Pressable>
        </View>

        {/* Emergency Contact */}
        <View className="mx-4 mt-4">
          <InfoNotice
            title="Medical Emergency"
            message="For medical emergencies, call 911 immediately. Do not use this app for urgent medical situations."
            iconName="alert-circle"
            iconColor="#DC2626"
            iconBackgroundColor="bg-red-100"
            backgroundColor="bg-red-50"
            borderColor="border-red-200"
            titleColor="text-red-900"
            textColor="text-red-800"
          />
        </View>

        {/* Contact Information */}
        <View className="mx-4 mt-4">
          <InfoNotice
            title="Medicus Support"
            message={
              '📧 support@mediapp.com\n📞 1-555-000-0000\n🕒 Monday - Friday, 9:00 AM - 5:00 PM EST'
            }
            iconName="information"
          />
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </StandardScreenLayout>
  );
};

export default HelpSettings;
