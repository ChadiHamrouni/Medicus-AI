import { useAppContext } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { switchToPatientMode } from '@/utils/auth/roleSwitching';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Card } from '@/components/shared/ui';
import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useHeaderHeight } from '@react-navigation/elements';

// Settings section configuration
interface SettingsSection {
  key: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  badge?: number;
}

const SETTINGS_SECTIONS = {
  accountManagement: [
    {
      key: 'account',
      title: 'Account',
      description: 'Email, phone, password, verification status',
      icon: 'account-cog',
      route: '/tabs/settings/account',
    },
    {
      key: 'dependents',
      title: 'Dependents',
      description: 'Manage family members and dependents',
      icon: 'account-group',
      route: '/tabs/settings/dependents',
    },
    {
      key: 'notifications',
      title: 'Notifications',
      description: 'Push, email, SMS preferences by category',
      icon: 'bell-outline',
      route: '/tabs/settings/notifications',
    },
  ],
};

const SettingsTab: React.FC = () => {
  const router = useRouter();
  // const headerHeight = useHeaderHeight();
  const { authState, logout } = useAuthContext();
  const { clearSession, userAssistant, setUserAssistant } = useAppContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const handleSectionPress = useCallback(
    (section: SettingsSection) => {
      router.push(section.route as any);
    },
    [router]
  );

  const handleSwitchToPatientMode = useCallback(() => {
    Alert.alert(
      'Switch to Patient View',
      "You'll need to logout and login again to return to Doctor mode. Continue?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          style: 'default',
          onPress: async () => {
            if (authState.user) {
              setIsSwitchingRole(true);
              try {
                await switchToPatientMode({
                  targetAssistant: 'mediaid',
                  // Force cast or ensure compatibility if types differ between AuthContext and AppContext
                  currentUserRole: authState.user.role as any,
                  userId: String(authState.user.id),
                  onNavigationChange: route => router.replace(route as any),
                });
                await setUserAssistant('mediaid');
              } catch (error) {
                console.error('Failed to switch mode:', error);
                setIsSwitchingRole(false);
                Alert.alert(
                  'Error',
                  'Failed to switch to patient mode. Please try again.'
                );
              }
            }
          },
        },
      ]
    );
  }, [authState.user, router]);

  // Filter settings sections based on current mode
  const getFilteredSections = useCallback(
    (sections: SettingsSection[]) => {
      let filtered = sections;

      // Filter out dependents if user is NOT in patient mode
      // This allows 'doctor' role to see dependents when they are in 'mediaid' (patient) mode
      // and 'patient' role to see it always (as they are always in 'mediaid' mode effectively)
      if (userAssistant !== 'mediaid' && authState.user?.role !== 'patient') {
        filtered = filtered.filter(section => section.key !== 'dependents');
      }

      // In patient mode, hide any doctor-specific settings
      if (userAssistant === 'mediaid') {
        // For now, all current settings are patient-appropriate
        // Future doctor-specific settings (like practice management) would be filtered out here
        return filtered.filter(section => {
          // Hide doctor-specific settings in patient mode
          const doctorOnlySettings = [
            'practice_management',
            'billing',
            'staff_management',
          ];
          return !doctorOnlySettings.includes(section.key);
        });
      }
      return filtered;
    },
    [userAssistant, authState.user?.role]
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Show loading state
            setIsSigningOut(true);

            // BRD: Clear all session variables and reset to login screen
            await clearSession();
            await logout();
          } catch {
            setIsSigningOut(false);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  }, [logout, clearSession]);

  const renderSectionItem = (section: SettingsSection) => {
    const isDisabled =
      section.key === 'linked_devices' ||
      section.key === 'security' ||
      section.key === 'communication' ||
      section.key === 'appearance' ||
      section.key === 'language_region' ||
      section.key === 'privacy' ||
      section.key === 'help' ||
      section.key === 'about' ||
      section.key === 'invite';

    return (
      <Pressable
        key={section.key}
        className={`flex-row items-center px-4 py-4 border-b border-gray-100 ${isDisabled ? 'opacity-50' : ''}`}
        onPress={isDisabled ? undefined : () => handleSectionPress(section)}
        disabled={isDisabled}
        style={({ pressed }) => [!isDisabled && pressed && { opacity: 0.7 }]}
      >
        {/* Section Icon */}
        <View className="mr-4">
          <MaterialCommunityIcons
            name={section.icon as any}
            size={36}
            color={isDisabled ? '#9CA3AF' : '#F05C0C'}
          />
        </View>

        {/* Section Content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className={`text-base font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}
            >
              {section.title}
              {isDisabled && (
                <Text className="text-xs text-gray-400 font-normal">
                  {' '}
                  (Coming Soon)
                </Text>
              )}
            </Text>
            {section.badge !== null &&
              section.badge !== undefined &&
              section.badge > 0 &&
              !isDisabled && (
                <View className="bg-[#F05C0C] rounded-full min-w-5 h-5 items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">
                    {section.badge}
                  </Text>
                </View>
              )}
          </View>
          <Text
            className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {section.description}
          </Text>
        </View>

        {/* Arrow */}
        <View className="ml-2">
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={isDisabled ? '#D1D5DB' : '#9CA3AF'}
          />
        </View>
      </Pressable>
    );
  };

  const renderGroup = (
    title: string,
    sections: SettingsSection[],
    isFirst = false
  ) => (
    <View className={isFirst ? 'mt-2 mx-4 p-0' : 'mt-6 mx-4 p-0'} key={title}>
      {sections.map((section, index) => (
        <View key={section.key}>
          {renderSectionItem(section)}
          {index < sections.length - 1 && <View className="h-0" />}
        </View>
      ))}
    </View>
  );

  return (
    <StandardScreenLayout title="Settings" showBackButton={false} noScroll>
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Account Management */}
          {renderGroup(
            'Account Management',
            getFilteredSections(SETTINGS_SECTIONS.accountManagement),
            true
          )}

          {/* Bottom Actions Row */}
          <View className="mx-4 mb-4 mt-6 flex-row gap-3" style={{ zIndex: 1 }}>
            {/* Switch to Patient Button - Only for Doctors */}
            {userAssistant === 'medidoc' && (
              <View className="flex-1">
                <Card
                  className="overflow-hidden"
                  onPress={handleSwitchToPatientMode}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center justify-center px-4 py-4 bg-[#F05C0C]/10">
                    <View className="mr-2">
                      <MaterialCommunityIcons
                        name="account-switch"
                        size={20}
                        color="#F05C0C"
                      />
                    </View>
                    <Text className="text-base font-semibold text-[#F05C0C] text-center">
                      Switch to Patient
                    </Text>
                  </View>
                </Card>
              </View>
            )}

            {/* Logout Button */}
            <View className="flex-1">
              <Card
                className="overflow-hidden"
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center px-4 py-4">
                  <View className="mr-2">
                    <MaterialCommunityIcons
                      name="logout"
                      size={20}
                      color="#DC2626"
                    />
                  </View>
                  <Text className="text-base font-semibold text-red-600 text-center">
                    Sign Out
                  </Text>
                </View>
              </Card>
            </View>
          </View>

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </View>

      {/* Loading Modal for Sign Out */}
      <Modal
        visible={isSigningOut || isSwitchingRole}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-2xl p-8 mx-8 items-center shadow-2xl">
            <View className="mb-6">
              <ActivityIndicator size="large" color="#DC2626" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {isSwitchingRole ? 'Switching Profile' : 'Signing Out'}
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              {isSwitchingRole
                ? 'Please wait while we switch to patient view...'
                : 'Please wait while we securely sign you out...'}
            </Text>
          </View>
        </View>
      </Modal>
    </StandardScreenLayout>
  );
};

export default SettingsTab;
