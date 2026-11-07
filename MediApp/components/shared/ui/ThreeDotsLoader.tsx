import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface ThreeDotsLoaderProps {
  color?: string;
  size?: number;
}

export const ThreeDotsLoader: React.FC<ThreeDotsLoaderProps> = ({
  color = '#F05C0C',
  size = 12,
}) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const duration = 600;
    const delay = 200;

    // Dot 1 animation
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Dot 2 animation with delay
    setTimeout(() => {
      dot2.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }, delay);

    // Dot 3 animation with double delay
    setTimeout(() => {
      dot3.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }, delay * 2);
  }, [dot1, dot2, dot3]);

  const animatedStyle1 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot1.value * 0.7,
    transform: [{ scale: 0.7 + dot1.value * 0.3 }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot2.value * 0.7,
    transform: [{ scale: 0.7 + dot2.value * 0.3 }],
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot3.value * 0.7,
    transform: [{ scale: 0.7 + dot3.value * 0.3 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          animatedStyle1,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
            marginHorizontal: size * 0.8,
          },
          animatedStyle2,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          animatedStyle3,
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
  dot: {},
});
