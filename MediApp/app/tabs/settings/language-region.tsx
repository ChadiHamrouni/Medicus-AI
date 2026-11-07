import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
type TimeFormat = '12h' | '24h';
type MeasurementSystem = 'imperial' | 'metric';

const LanguageRegionSettings: React.FC = () => {
  const router = useRouter();

  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York');
  const [dateFormat, setDateFormat] = useState<DateFormat>('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [measurementSystem, setMeasurementSystem] =
    useState<MeasurementSystem>('imperial');

  const languages = [
    {
      code: 'en' as Language,
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
    },
    {
      code: 'es' as Language,
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸',
    },
    {
      code: 'fr' as Language,
      name: 'French',
      nativeName: 'Français',
      flag: '🇫🇷',
    },
    {
      code: 'de' as Language,
      name: 'German',
      nativeName: 'Deutsch',
      flag: '🇩🇪',
    },
    {
      code: 'it' as Language,
      name: 'Italian',
      nativeName: 'Italiano',
      flag: '🇮🇹',
    },
    {
      code: 'pt' as Language,
      name: 'Portuguese',
      nativeName: 'Português',
      flag: '🇵🇹',
    },
    { code: 'zh' as Language, name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    {
      code: 'ja' as Language,
      name: 'Japanese',
      nativeName: '日本語',
      flag: '🇯🇵',
    },
  ];

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
    { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
    { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  ];

  const dateFormats: { value: DateFormat; label: string; example: string }[] = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/25/2024' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '25/12/2024' },
    { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD', example: '2024/12/25' },
  ];

  const timeFormats: { value: TimeFormat; label: string; example: string }[] = [
    { value: '12h', label: '12-hour', example: '2:30 PM' },
    { value: '24h', label: '24-hour', example: '14:30' },
  ];

  const measurementSystems: {
    value: MeasurementSystem;
    label: string;
    description: string;
  }[] = [
    {
      value: 'imperial',
      label: 'Imperial',
      description: 'Feet, inches, pounds, Fahrenheit',
    },
    {
      value: 'metric',
      label: 'Metric',
      description: 'Meters, centimeters, kilograms, Celsius',
    },
  ];

  const handleTimezonePress = () => {};

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
            Language & Region
          </Text>
        </View>

        <ScrollView className="flex-1">
          {/* Language Selection */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <View className="p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                Language
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                Choose your preferred language
              </Text>
            </View>

            {languages.map((language, index) => (
              <TouchableOpacity
                key={language.code}
                className="flex-row items-center px-4 py-4"
                onPress={() => setSelectedLanguage(language.code)}
              >
                <View className="mr-4 w-8 h-8 items-center justify-center">
                  <Text className="text-2xl">{language.flag}</Text>
                </View>

                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {language.name}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {language.nativeName}
                  </Text>
                </View>

                <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
                  {selectedLanguage === language.code && (
                    <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
                  )}
                </View>

                {index < languages.length - 1 && (
                  <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Timezone */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <TouchableOpacity
              className="flex-row items-center px-4 py-4"
              onPress={handleTimezonePress}
            >
              <View className="mr-4">
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color="#F05C0C"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Time Zone
                </Text>
                <Text className="text-sm text-gray-600">
                  {timezones.find(tz => tz.value === selectedTimezone)?.label}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Date Format */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <View className="p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                Date Format
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                How dates are displayed throughout the app
              </Text>
            </View>

            {dateFormats.map((format, index) => (
              <TouchableOpacity
                key={format.value}
                className="flex-row items-center px-4 py-4"
                onPress={() => setDateFormat(format.value)}
              >
                <View className="mr-4">
                  <MaterialCommunityIcons
                    name="calendar"
                    size={24}
                    color="#F05C0C"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {format.label}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Example: {format.example}
                  </Text>
                </View>

                <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
                  {dateFormat === format.value && (
                    <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
                  )}
                </View>

                {index < dateFormats.length - 1 && (
                  <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Format */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <View className="p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                Time Format
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                Choose 12-hour or 24-hour time display
              </Text>
            </View>

            {timeFormats.map((format, index) => (
              <TouchableOpacity
                key={format.value}
                className="flex-row items-center px-4 py-4"
                onPress={() => setTimeFormat(format.value)}
              >
                <View className="mr-4">
                  <MaterialCommunityIcons
                    name="clock"
                    size={24}
                    color="#F05C0C"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {format.label}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Example: {format.example}
                  </Text>
                </View>

                <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
                  {timeFormat === format.value && (
                    <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
                  )}
                </View>

                {index < timeFormats.length - 1 && (
                  <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Measurement System */}
          <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
            <View className="p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                Measurement System
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                Units for height, weight, and temperature
              </Text>
            </View>

            {measurementSystems.map((system, index) => (
              <TouchableOpacity
                key={system.value}
                className="flex-row items-center px-4 py-4"
                onPress={() => setMeasurementSystem(system.value)}
              >
                <View className="mr-4">
                  <MaterialCommunityIcons
                    name="ruler"
                    size={24}
                    color="#F05C0C"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {system.label}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {system.description}
                  </Text>
                </View>

                <View className="w-6 h-6 rounded-full border-2 border-gray-300 items-center justify-center">
                  {measurementSystem === system.value && (
                    <View className="w-3 h-3 rounded-full bg-[#F05C0C]" />
                  )}
                </View>

                {index < measurementSystems.length - 1 && (
                  <View className="absolute bottom-0 left-16 right-4 h-px bg-gray-100" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Regional Info */}
          <View className="bg-blue-50 mx-4 mt-4 rounded-lg border border-blue-200 p-4">
            <View className="flex-row items-start">
              <MaterialCommunityIcons
                name="earth"
                size={22}
                color="#2563EB"
                className="mr-3 mt-0.5"
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-blue-900 mb-1">
                  Regional Settings
                </Text>
                <Text className="text-sm text-blue-800 font-medium">
                  These settings affect how dates, times, numbers, and
                  measurements are displayed throughout the app. Changes will
                  take effect immediately.
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

export default LanguageRegionSettings;
