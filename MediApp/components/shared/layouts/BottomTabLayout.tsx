import { BottomTabNavigation } from '@/components/shared/navigation/BottomTabNavigation';
import { useTabBadges } from '@/hooks/navigation';

import React from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BottomTabLayoutProps {
  children: React.ReactNode;
  showTabs?: boolean; // Override tab visibility (true/false). Undefined = default behavior (show)
}

// Always show tabs per user request

export const BottomTabLayout: React.FC<BottomTabLayoutProps> = ({
  children,
  showTabs: overrideShowTabs,
}) => {
  const badges = useTabBadges();

  // Practice routes - these should also show tabs

  // Always show tabs unless explicitly overridden off
  const tabsVisible = overrideShowTabs !== undefined ? overrideShowTabs : true;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-1">{children}</View>
      </SafeAreaView>
      <BottomTabNavigation visible={tabsVisible} badges={badges} />
    </View>
  );
};

export default BottomTabLayout;
