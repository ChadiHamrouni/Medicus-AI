import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';

export const LoadMoreIndicator = React.memo(() => (
  <View className="py-4 items-center justify-center">
    <ActivityIndicator size="small" color="#007AFF" />
    <Text className="text-sm text-gray-500 mt-2">
      Loading older messages...
    </Text>
  </View>
));

if (LoadMoreIndicator) {
  LoadMoreIndicator.displayName = 'LoadMoreIndicator';
}

export const TypingIndicator = React.memo(() => {
  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.4)).current;
  const dot3Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animateDots = () => {
      const duration = 600;

      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Opacity, {
            toValue: 0.4,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.4,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.4,
            duration: duration / 3,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDots();
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  return (
    <View className="px-4 py-2">
      <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3 self-start max-w-[80%]">
        <View className="flex-row space-x-1">
          <Animated.View
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#9CA3AF',
              borderRadius: 4,
              opacity: dot1Opacity,
            }}
          />
          <Animated.View
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#9CA3AF',
              borderRadius: 4,
              marginLeft: 4,
              opacity: dot2Opacity,
            }}
          />
          <Animated.View
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#9CA3AF',
              borderRadius: 4,
              marginLeft: 4,
              opacity: dot3Opacity,
            }}
          />
        </View>
        <Text className="text-sm text-gray-500 ml-2">typing...</Text>
      </View>
    </View>
  );
});

if (TypingIndicator) {
  TypingIndicator.displayName = 'TypingIndicator';
}

export const ListFooter = React.memo(() => <View className="h-4" />);

if (ListFooter) {
  ListFooter.displayName = 'ListFooter';
}
