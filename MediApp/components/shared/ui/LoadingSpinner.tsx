import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#F05C0C',
}) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  const dotSize = size === 'small' ? 8 : size === 'large' ? 16 : 12;
  const spacing = size === 'small' ? 8 : size === 'large' ? 16 : 12;

  useEffect(() => {
    const createAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createAnimation(dot1Anim, 0);
    const animation2 = createAnimation(dot2Anim, 200);
    const animation3 = createAnimation(dot3Anim, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  const animatedStyle = (animatedValue: Animated.Value) => ({
    opacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color },
          animatedStyle(dot1Anim),
        ]}
      />
      <View style={{ width: spacing }} />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color },
          animatedStyle(dot2Anim),
        ]}
      />
      <View style={{ width: spacing }} />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color },
          animatedStyle(dot3Anim),
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 999,
  },
});
