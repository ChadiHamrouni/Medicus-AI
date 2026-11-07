import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import {
  ANIMATION_DURATION,
  MESSAGE_COLORS,
  OPACITY_VALUES,
} from './constants';

export const useMessageAnimation = (
  isUploading?: boolean,
  uploadStatus?: 'sending' | 'failed'
) => {
  // Determine initial opacity based on current state
  const getTargetOpacity = useCallback(() => {
    if (isUploading && uploadStatus === 'sending') {
      return OPACITY_VALUES.sending;
    } else if (uploadStatus === 'failed') {
      return OPACITY_VALUES.failed;
    }
    return OPACITY_VALUES.default;
  }, [isUploading, uploadStatus]);

  const fadeAnim = useRef(new Animated.Value(getTargetOpacity())).current;

  useEffect(() => {
    const targetOpacity = getTargetOpacity();

    Animated.timing(fadeAnim, {
      toValue: targetOpacity,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [isUploading, uploadStatus, fadeAnim, getTargetOpacity]);

  return fadeAnim;
};

export const useDisplaySender = (sender: string, isCurrentUser: boolean) => {
  return useMemo(() => {
    if (isCurrentUser) return '';

    // If sender already includes "Sara", pass it through as-is
    // (handles both "Sara AI Assistant" and "Sara - on behalf of X")
    if (sender.includes('Sara')) {
      return sender;
    }

    const senderLower = sender.toLowerCase();
    if (
      senderLower.includes('assistant') ||
      senderLower.includes('ai') ||
      senderLower.includes('bot') ||
      sender === 'assistant'
    ) {
      return 'Sara AI Assistant';
    }

    return sender;
  }, [sender, isCurrentUser]);
};

export const useMessageStyles = (
  isCurrentUser: boolean,
  uploadStatus?: 'sending' | 'failed',
  displaySender?: string,
  fadeAnim?: Animated.Value
) => {
  const messageBubbleClass = useMemo(() => {
    const baseClass = 'rounded-2xl p-2';
    const tailClass = isCurrentUser ? 'rounded-tr-none' : 'rounded-tl-none';

    if (uploadStatus === 'sending') {
      const bgClass = isCurrentUser
        ? MESSAGE_COLORS.sending.current
        : MESSAGE_COLORS.sending.other;
      return `${baseClass} ${bgClass} ${tailClass}`;
    }

    if (uploadStatus === 'failed') {
      const bgClass = isCurrentUser
        ? MESSAGE_COLORS.failed.current
        : MESSAGE_COLORS.failed.other;
      return `${baseClass} ${bgClass} ${tailClass}`;
    }

    if (!isCurrentUser && displaySender?.startsWith('Sara')) {
      // Sara messages: transparent background
      return `rounded-2xl p-2 ${MESSAGE_COLORS.default.sara} ${tailClass}`;
    }

    const bgClass = isCurrentUser
      ? MESSAGE_COLORS.default.current
      : MESSAGE_COLORS.default.other;
    return `${baseClass} ${bgClass} ${tailClass}`;
  }, [isCurrentUser, uploadStatus, displaySender]);

  const messageBubbleStyle = useMemo(
    () => ({
      opacity:
        isCurrentUser && uploadStatus === 'failed'
          ? OPACITY_VALUES.failedBubble
          : OPACITY_VALUES.default,
    }),
    [isCurrentUser, uploadStatus]
  );

  const messageContainerStyle = useMemo(
    () => ({
      opacity: fadeAnim,
      flexDirection: 'row' as const,
      marginBottom: 16,
      justifyContent: isCurrentUser
        ? ('flex-end' as const)
        : ('flex-start' as const),
    }),
    [fadeAnim, isCurrentUser]
  );

  const messageContentClass = useMemo(() => {
    // Sara messages use nearly full width (95%), user messages stay at 70%
    const widthClass =
      !isCurrentUser && displaySender?.startsWith('Sara')
        ? 'max-w-[95%]'
        : 'max-w-[70%]';
    return `${widthClass} ${isCurrentUser ? 'items-end' : 'items-start'}`;
  }, [isCurrentUser, displaySender]);

  const textClass = useMemo(() => {
    return `text-sm ${isCurrentUser ? 'text-gray-900 font-medium' : 'text-gray-800'}`;
  }, [isCurrentUser]);

  return {
    messageBubbleClass,
    messageBubbleStyle,
    messageContainerStyle,
    messageContentClass,
    textClass,
  };
};

export const useMapHandler = () => {
  return useCallback((latitude: number, longitude: number) => {
    const url = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    return url;
  }, []);
};
