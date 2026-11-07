import { BottomTabNavigation } from '@/components/shared/navigation/BottomTabNavigation';
import { useTabBadges } from '@/hooks/navigation';
import { Slot, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function TabsLayout() {
  const badges = useTabBadges();
  const pathname = usePathname();

  // Hide tab bar on chat detail, patients, settings, doctors pages (when viewing individual chat)
  const shouldHideTabBar =
    pathname.match(/\/tabs\/chats\/[^\/]+$/) !== null ||
    (pathname.startsWith('/tabs/patients/') && pathname !== '/tabs/patients') ||
    (pathname.startsWith('/tabs/doctor/') && pathname !== '/tabs/doctor') ||
    (pathname.startsWith('/tabs/settings/') && pathname !== '/tabs/settings');

  return (
    <View className="flex-1">
      {/* Tab content */}
      <Slot />

      {/* Bottom navigation */}
      <BottomTabNavigation visible={!shouldHideTabBar} badges={badges} />
    </View>
  );
}
