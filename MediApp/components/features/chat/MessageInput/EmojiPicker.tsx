import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import EmojiSelector from 'react-native-emoji-selector';

interface EmojiPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: string) => void;
  height: number;
  insets: {
    bottom: number;
  };
}

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({
  visible,
  onClose,
  onEmojiSelected,
  height,
  insets,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Animated.View
            className="bg-white rounded-t-3xl"
            style={{
              paddingBottom: insets.bottom,
              height: height,
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
            }}
          >
            <View className="h-1 w-12 bg-gray-300 rounded-full mx-auto my-2" />
            <View style={{ flex: 1 }}>
              <EmojiSelector
                onEmojiSelected={onEmojiSelected}
                showSearchBar={true}
                showHistory={true}
                showSectionTitles={true}
                columns={8}
                theme="light"
              />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};
