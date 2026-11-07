import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';

type Theme = 'light' | 'dark' | 'system';
type DefaultView = 'doctor' | 'patient' | 'chats';
type FontSize = 'small' | 'medium' | 'large';

const AppearanceSettings: React.FC = () => {
  const router = useRouter();

  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [defaultView, setDefaultView] = useState<DefaultView>('chats');
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  const themes: {
    value: Theme;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      value: 'light',
      label: 'Light',
      description: 'Use light theme all the time',
      icon: 'white-balance-sunny',
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Use dark theme all the time',
      icon: 'weather-night',
    },
    {
      value: 'system',
      label: 'System',
      description: 'Automatically switch based on system settings',
      icon: 'theme-light-dark',
    },
  ];

  const defaultViews: {
    value: DefaultView;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      value: 'chats',
      label: 'Chats',
      description: 'Open to conversations and messages',
      icon: 'comment-multiple',
    },
    {
      value: 'doctor',
      label: 'Doctor Profile',
      description: 'Open to doctor profile and settings',
      icon: 'stethoscope',
    },
    {
      value: 'patient',
      label: 'Patient Records',
      description: 'Open to patient information and records',
      icon: 'account-heart',
    },
  ];

  const fontSizes: { value: FontSize; label: string; description: string }[] = [
    {
      value: 'small',
      label: 'Small',
      description: 'Compact text for more content',
    },
    {
      value: 'medium',
      label: 'Medium',
      description: 'Standard text size (recommended)',
    },
    {
      value: 'large',
      label: 'Large',
      description: 'Larger text for better readability',
    },
  ];

  return (
    <StandardScreenLayout title="Appearance" onBack={() => router.back()}>
      {/* Theme Selection */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">Theme</Text>
          <Text className="text-sm text-gray-600 mt-1">
            Choose your preferred color scheme
          </Text>
        </View>

        {themes.map((theme, index) => (
          <TouchableOpacity
            key={theme.value}
            className="flex-row items-center px-4 py-4"
            onPress={() => setSelectedTheme(theme.value)}
          >
            <View className="mr-4">
              <MaterialCommunityIcons
                name={theme.icon as any}
                size={24}
                color="#F05C0C"
              />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {theme.label}
              </Text>
              <Text className="text-sm text-gray-600">{theme.description}</Text>
            </View>

            <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
              {selectedTheme === theme.value && (
                <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
              )}
            </View>

            {index < themes.length - 1 && (
              <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Default View */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Default View
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Choose which screen opens when you start the app
          </Text>
        </View>

        {defaultViews.map((view, index) => (
          <TouchableOpacity
            key={view.value}
            className="flex-row items-center px-4 py-4"
            onPress={() => setDefaultView(view.value)}
          >
            <View className="mr-4">
              <MaterialCommunityIcons
                name={view.icon as any}
                size={24}
                color="#F05C0C"
              />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {view.label}
              </Text>
              <Text className="text-sm text-gray-600">{view.description}</Text>
            </View>

            <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
              {defaultView === view.value && (
                <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
              )}
            </View>

            {index < defaultViews.length - 1 && (
              <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Font Size */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">Font Size</Text>
          <Text className="text-sm text-gray-600 mt-1">
            Adjust text size throughout the app
          </Text>
        </View>

        {fontSizes.map((size, index) => (
          <TouchableOpacity
            key={size.value}
            className="flex-row items-center px-4 py-4"
            onPress={() => setFontSize(size.value)}
          >
            <View className="mr-4">
              <MaterialCommunityIcons
                name="format-size"
                size={
                  size.value === 'small'
                    ? 20
                    : size.value === 'medium'
                      ? 24
                      : 28
                }
                color="#F05C0C"
              />
            </View>

            <View className="flex-1">
              <Text
                className={`font-semibold text-gray-900 ${
                  size.value === 'small'
                    ? 'text-sm'
                    : size.value === 'medium'
                      ? 'text-base'
                      : 'text-lg'
                }`}
              >
                {size.label}
              </Text>
              <Text
                className={`text-gray-600 ${
                  size.value === 'small'
                    ? 'text-xs'
                    : size.value === 'medium'
                      ? 'text-sm'
                      : 'text-base'
                }`}
              >
                {size.description}
              </Text>
            </View>

            <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
              {fontSize === size.value && (
                <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
              )}
            </View>

            {index < fontSizes.length - 1 && (
              <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Preview */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">Preview</Text>
          <Text className="text-sm text-gray-600 mt-1">
            See how your settings will look
          </Text>
        </View>

        <View className="p-4">
          <Text
            className={`font-semibold text-gray-900 mb-2 ${
              fontSize === 'small'
                ? 'text-sm'
                : fontSize === 'medium'
                  ? 'text-base'
                  : 'text-lg'
            }`}
          >
            Sample Header Text
          </Text>
          <Text
            className={`text-gray-600 mb-4 ${
              fontSize === 'small'
                ? 'text-xs'
                : fontSize === 'medium'
                  ? 'text-sm'
                  : 'text-base'
            }`}
          >
            This is how regular text will appear with your selected font size.
            You can adjust the size to match your preference for readability.
          </Text>

          <View className="flex-row items-center p-3 bg-gray-50 rounded-lg">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={24}
              color="#F05C0C"
              className="mr-3"
            />
            <View>
              <Text
                className={`font-medium text-gray-900 ${
                  fontSize === 'small'
                    ? 'text-sm'
                    : fontSize === 'medium'
                      ? 'text-base'
                      : 'text-lg'
                }`}
              >
                Health Records
              </Text>
              <Text
                className={`text-gray-600 ${
                  fontSize === 'small'
                    ? 'text-xs'
                    : fontSize === 'medium'
                      ? 'text-sm'
                      : 'text-base'
                }`}
              >
                Sample menu item
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom spacing */}
      <View className="h-8" />
    </StandardScreenLayout>
  );
};

export default AppearanceSettings;
