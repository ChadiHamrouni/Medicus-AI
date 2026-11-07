import { useAppContext } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import type { TabBadges } from '@/hooks/navigation';
import { UserRole } from '@/types/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type TabBadge = { count: number; visible: boolean };
type TabConfig = {
  key: string;
  icon: string;
  label: string;
  route: string;
  roles?: UserRole[];
  badge?: TabBadge;
  disabled?: boolean;
};

interface BottomTabNavigationProps {
  visible?: boolean;
  badges?: TabBadges;
}

// Animated Tab Component
const AnimatedTab: React.FC<{
  tab: TabConfig;
  isActive: boolean;
  onPress: (_tab: TabConfig) => void;
  getCustomIconSource: (_iconName: string) => any;
}> = ({ tab, isActive, onPress, getCustomIconSource }) => {
  const isDisabled = tab.disabled;
  const iconColor = isDisabled ? '#D1D5DB' : isActive ? '#000000' : '#6B7280';
  const textColor = isDisabled ? '#D1D5DB' : isActive ? '#000000' : '#6B7280';
  const customIconSource = getCustomIconSource(tab.icon);

  const scale = useSharedValue(isActive ? 1.05 : 1);
  const opacity = useSharedValue(isActive ? 1 : 0.7);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.05 : 1, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(isActive ? 1 : 0.7, {
      duration: 200,
    });
  }, [isActive, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isDisabled ? 0.5 : opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={() => onPress(tab)}
        className="items-center justify-center relative flex-1 min-h-[50px]"
        activeOpacity={isDisabled ? 1 : 0.6}
        disabled={isDisabled}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        {/* Badge */}
        {tab.badge?.visible && tab.badge.count > 0 && (
          <View
            className="absolute -top-1 z-10"
            style={{
              right: '35%',
              transform: [{ translateX: 8 }],
            }}
          >
            <View
              className="bg-red-500 rounded-full min-w-4 h-4 items-center justify-center"
              style={{
                minWidth: 16,
                paddingHorizontal: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 3,
              }}
            >
              <Text
                className="text-white font-bold"
                style={{
                  fontSize: 10,
                  lineHeight: 12,
                }}
              >
                {tab.badge.count > 99 ? '99+' : tab.badge.count}
              </Text>
            </View>
          </View>
        )}

        {/* Icon Container */}
        <View
          className="items-center justify-center mb-1"
          style={{
            width: 42,
            height: 42,
          }}
        >
          {customIconSource ? (
            <Image
              source={customIconSource}
              style={{
                width: isActive ? 39 : 36,
                height: isActive ? 39 : 36,
                tintColor: iconColor,
              }}
              resizeMode="contain"
            />
          ) : (
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={isActive ? 39 : 36}
              color={iconColor}
            />
          )}
        </View>

        {/* Label */}
        <Text
          style={{
            color: textColor,
            fontSize: 10,
            fontWeight: isActive ? '600' : '400',
            lineHeight: 12,
            marginTop: 1,
          }}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const BottomTabNavigation: React.FC<BottomTabNavigationProps> = ({
  visible = true,
  badges = {} as TabBadges,
}) => {
  const pathname = usePathname();
  const { authState } = useAuthContext();
  const { userAssistant } = useAppContext();
  const insets = useSafeAreaInsets();

  // Get custom image source for custom icons
  const getCustomIconSource = (iconName: string) => {
    switch (iconName) {
      case 'custom-chat':
        return require('@/assets/images/chat_icon.png');
      case 'custom-documents':
        return require('@/assets/images/documents_icon.png');
      case 'custom-doctor':
        return require('@/assets/images/doctor_icon.png');
      case 'custom-patient':
        return require('@/assets/images/patient_icon.png');
      case 'custom-settings':
        return require('@/assets/images/settings_icon.png');
      default:
        return null;
    }
  };

  // Get role-specific third tab
  const getRoleSpecificTab = (): TabConfig => {
    // For development: assume PATIENT role if no user is set
    const isDoctor = authState.user?.role === UserRole.DOCTOR;

    if (isDoctor) {
      // For doctors, show dynamic icon and route based on current assistant mode
      const isPatientMode = userAssistant === 'mediaid';
      const icon = isPatientMode ? 'custom-patient' : 'custom-doctor';
      const label = isPatientMode ? 'Patient' : 'Doctor';
      const route = isPatientMode ? '/tabs/patients' : '/tabs/doctor';

      return {
        key: isPatientMode ? 'patient' : 'doctor',
        icon,
        label,
        route,
        badge: isPatientMode
          ? badges.patient
          : badges.doctor || badges.practice, // Support both badge keys for backward compatibility
      };
    } else {
      return {
        key: 'patient',
        icon: 'custom-patient',
        label: 'Patient',
        route: '/tabs/patients',
        badge: badges.patient,
      };
    }
  };

  // Tab configuration with role-based filtering
  const tabs: TabConfig[] = [
    {
      key: 'chats',
      icon: 'custom-chat',
      label: 'Chats',
      route: '/tabs/chats',
      badge: badges.chats,
    },
    {
      key: 'documents',
      icon: 'custom-documents',
      label: 'Docs',
      route: '/tabs/documents',
      badge: badges.documents,
    },
    {
      key: 'feed',
      icon: 'apps',
      label: 'Feed',
      route: '/tabs/feed',
      badge: badges.feed,
      disabled: true,
    },
    getRoleSpecificTab(), // Dynamic tab based on user role
    {
      key: 'settings',
      icon: 'custom-settings',
      label: 'Settings',
      route: '/tabs/settings',
      badge: badges.settings,
    },
  ];

  // Filter tabs based on user role
  const availableTabs = tabs.filter(tab => {
    if (tab.roles) {
      return tab.roles.includes(authState.user?.role as UserRole);
    }
    return true;
  });

  // Determine active tab based on current route
  const getActiveTab = (): string => {
    // Handle redirected routes for chats and documents with more comprehensive matching
    if (pathname === '/tabs/chats' || pathname.startsWith('/tabs/chats/')) {
      return 'chats';
    }

    if (
      pathname === '/tabs/documents' ||
      pathname.startsWith('/tabs/documents/')
    ) {
      return 'documents';
    }

    if (pathname === '/tabs/feed' || pathname.startsWith('/tabs/feed/')) {
      return 'feed';
    }

    // Standard tab routes
    if (pathname === '/tabs/doctor' || pathname.startsWith('/tabs/doctor/'))
      return 'doctor';
    if (pathname === '/tabs/patients' || pathname.startsWith('/tabs/patients/'))
      return 'patient';
    if (pathname.includes('/tabs/practice')) return 'doctor'; // Backward compatibility
    if (
      pathname === '/tabs/settings' ||
      pathname.startsWith('/tabs/settings/') ||
      pathname.startsWith('/settings/')
    )
      return 'settings';

    // Fallback: check if any tab route matches the current pathname
    for (const tab of tabs) {
      if (pathname === tab.route || pathname.startsWith(tab.route + '/')) {
        return tab.key;
      }
    }

    return '';
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tab: TabConfig) => {
    if (tab.disabled) return; // Don't navigate if tab is disabled
    if (pathname === tab.route) return;
    router.push(tab.route as any);
  };

  if (!visible) return null as any;

  return (
    <View
      className="bg-white"
      style={{
        borderTopWidth: 0.5,
        borderTopColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        paddingBottom: Math.max(insets.bottom + 20, 32),
      }}
    >
      <View className="flex-row items-center justify-around px-1 pt-8">
        {availableTabs.map(tab => (
          <AnimatedTab
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={handleTabPress}
            getCustomIconSource={getCustomIconSource}
          />
        ))}
      </View>
    </View>
  );
};
