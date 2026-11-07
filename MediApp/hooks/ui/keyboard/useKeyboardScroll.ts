import { RefObject, useEffect } from 'react';
import { Keyboard, Platform, ScrollView } from 'react-native';

export const useKeyboardScroll = (scrollViewRef: RefObject<ScrollView>) => {
  useEffect(() => {
    // Keyboard listener for scrolling to bottom
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
    };
  }, [scrollViewRef]);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return { scrollToBottom };
};
