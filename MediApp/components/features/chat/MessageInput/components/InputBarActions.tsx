import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputBarActionsProps {
  onVoicePress: () => void;
  onRealTimePress?: () => void;
  showVoiceInput?: boolean;
  hasText?: boolean;
  showRTCButton?: boolean; // Show the live voice conversation button
}

/**
 * Right section action buttons - Mic and RTC
 */
export const InputBarActions: React.FC<InputBarActionsProps> = ({
  onVoicePress,
  onRealTimePress,
  showVoiceInput = false,
  hasText = false,
  showRTCButton = false,
}) => {
  // Hide buttons when typing text
  if (hasText && !showVoiceInput) {
    return <View className="w-2" />;
  }

  const BUTTON_SIZE = 44;
  const commonButtonStyle = {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View className="flex-row items-center">
      {!showVoiceInput && (
        <>
          {/* Mic Button */}
          <TouchableOpacity
            onPress={onVoicePress}
            className="bg-[#F05C0C] shadow-md"
            activeOpacity={0.85}
            style={commonButtonStyle}
          >
            <Ionicons name="mic" size={26} color="white" />
          </TouchableOpacity>

          {/* Live voice conversation with Sara */}
          {showRTCButton && onRealTimePress && (
            <TouchableOpacity
              onPress={onRealTimePress}
              className="bg-orange-100 border border-orange-300 ml-3"
              activeOpacity={0.75}
              style={commonButtonStyle}
              accessibilityLabel="Talk to Sara"
            >
              <Ionicons name="call" size={22} color="#F05C0C" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};