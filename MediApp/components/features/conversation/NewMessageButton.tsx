import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

interface NewMessageButtonProps {
  onPress: () => void;
  isMenuOpen: boolean;
}

export const NewMessageButton: React.FC<NewMessageButtonProps> = ({
  onPress,
  isMenuOpen,
}) => {
  const rightAnim = useRef(new Animated.Value(24)).current; // Tailwind right-6 = 24, right-14 = 56

  useEffect(() => {
    Animated.timing(rightAnim, {
      toValue: isMenuOpen ? 80 : 24,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isMenuOpen]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 24,
        right: rightAnim,
      }}
      className="z-50"
    >
      <TouchableOpacity
        onPress={onPress}
        className="bg-[#F05C0C] w-14 h-14 rounded-full items-center justify-center shadow"
      >
        <MaterialCommunityIcons name="message-plus" size={24} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};
