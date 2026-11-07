import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const TranscriptionLoader: React.FC = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    dot2.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    dot3.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [dot1, dot2, dot3]);

  const dot1Style = useAnimatedStyle(() => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    marginHorizontal: 2,
    opacity: 0.3 + dot1.value * 0.7,
    transform: [
      {
        scale: 0.8 + dot1.value * 0.4,
      },
    ],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    marginHorizontal: 2,
    opacity: 0.3 + dot2.value * 0.7,
    transform: [
      {
        scale: 0.8 + dot2.value * 0.4,
      },
    ],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    marginHorizontal: 2,
    opacity: 0.3 + dot3.value * 0.7,
    transform: [
      {
        scale: 0.8 + dot3.value * 0.4,
      },
    ],
  }));

  return (
    <View className="flex-row items-center justify-start">
      <Text className="text-sm text-gray-700 mr-2">
        Message being sent and transcribed
      </Text>
      <ReAnimated.View style={dot1Style} />
      <ReAnimated.View style={dot2Style} />
      <ReAnimated.View style={dot3Style} />
    </View>
  );
};

export default TranscriptionLoader;
