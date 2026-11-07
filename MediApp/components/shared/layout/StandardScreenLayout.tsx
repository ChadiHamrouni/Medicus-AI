import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ScreenHeader } from './ScreenHeader';

interface StandardScreenLayoutProps {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  noScroll?: boolean;
  bottomSpacingColor?: string;
  showBackButton?: boolean;
}

export const StandardScreenLayout: React.FC<StandardScreenLayoutProps> = ({
  title,
  onBack,
  children,
  footer,
  noScroll = false,
  bottomSpacingColor = 'bg-white',
  showBackButton = true,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1">
        <ScreenHeader
          title={title}
          onBack={onBack}
          showBackButton={showBackButton}
        />

        {noScroll ? (
          <View className="flex-1">
            <View className="flex-1">{children}</View>
          </View>
        ) : (
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={100}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            bounces={false}
            className="flex-1"
          >
            <View className="flex-1">{children}</View>
          </KeyboardAwareScrollView>
        )}

        {footer && (
          <View className="p-4 border-t border-gray-200 bg-white">
            {footer}
          </View>
        )}
      </View>
    </View>
  );
};
