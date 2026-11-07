import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';

const SecuritySettings: React.FC = () => {
  const router = useRouter();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);

  const handleChangePassword = () => {
    router.push('/settings/change-password' as any);
  };

  const handleSetupTwoFactor = () => {
    if (twoFactorEnabled) {
      Alert.alert(
        'Disable Two-Factor Authentication',
        'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => setTwoFactorEnabled(false),
          },
        ]
      );
    } else {
      setTwoFactorEnabled(true);
    }
  };

  const handleBiometricSetup = () => {
    setBiometricEnabled(!biometricEnabled);
  };

  const handleViewLoginActivity = () => {
    router.push('/settings/login-activity' as any);
  };

  const handleSecurityCheckup = () => {};

  return (
    <StandardScreenLayout
      title="Security Settings"
      onBack={() => router.back()}
    >
      {/* Authentication */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Authentication
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Secure your account access
          </Text>
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="two-factor-authentication"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Two-Factor Authentication
            </Text>
            <Text className="text-sm text-gray-600">
              {twoFactorEnabled
                ? 'Extra security enabled'
                : 'Add an extra layer of security'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSetupTwoFactor}>
            <Text className="text-[#F05C0C] font-medium">
              {twoFactorEnabled ? 'Manage' : 'Setup'}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center px-4 py-4">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="fingerprint"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Face ID / Touch ID
            </Text>
            <Text className="text-sm text-gray-600">
              Use biometrics to unlock the app
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricSetup}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* App Security */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            App Security
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Additional security features
          </Text>
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="lock-clock"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Auto-Lock
            </Text>
            <Text className="text-sm text-gray-600">
              Lock app after 5 minutes of inactivity
            </Text>
          </View>
          <Switch
            value={autoLockEnabled}
            onValueChange={setAutoLockEnabled}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center px-4 py-4">
          <View className="mr-4">
            <MaterialCommunityIcons
              name="bell-alert"
              size={24}
              color="#F05C0C"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Login Alerts
            </Text>
            <Text className="text-sm text-gray-600">
              Get notified of new device logins
            </Text>
          </View>
          <Switch
            value={loginAlertsEnabled}
            onValueChange={setLoginAlertsEnabled}
            trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Activity */}
      <View className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 shadow-sm">
        <View className="p-4 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">
            Security Activity
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Monitor your account security
          </Text>
        </View>

        <TouchableOpacity
          className="flex-row items-center px-4 py-4 border-b border-gray-100"
          onPress={handleViewLoginActivity}
        >
          <View className="mr-4">
            <MaterialCommunityIcons name="history" size={24} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Login Activity
            </Text>
            <Text className="text-sm text-gray-600">
              View recent login attempts and locations
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
          onPress={handleSecurityCheckup}
        >
          <View className="mr-4">
            <MaterialCommunityIcons
              name="shield-check"
              size={24}
              color="#10B981"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              Security Checkup
            </Text>
            <Text className="text-sm text-gray-600">
              Review your security settings and recommendations
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      </View>

      {/* Security Status */}
      <View className="bg-green-50 mx-4 mt-4 rounded-lg border border-green-200 p-4">
        <View className="flex-row items-start">
          <MaterialCommunityIcons
            name="shield-check"
            size={22}
            color="#059669"
            className="mr-3 mt-0.5"
          />
          <View className="flex-1">
            <Text className="text-sm text-green-900 font-medium">
              <Text className="font-semibold">Good security:</Text> Your account
              has strong security settings enabled.
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom spacing */}
      <View className="h-8" />
    </StandardScreenLayout>
  );
};

export default SecuritySettings;
