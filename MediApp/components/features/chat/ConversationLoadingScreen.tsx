import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConversationLoadingScreenProps {
  status?: 'creating' | 'connecting' | 'ready';
  participantName?: string;
}

export const ConversationLoadingScreen: React.FC<
  ConversationLoadingScreenProps
> = ({ status = 'creating', participantName }) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the spinner
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Sequential dot animation
    const dotAnimation = Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseAnimation.start();
    dotAnimation.start();

    return () => {
      pulseAnimation.stop();
      dotAnimation.stop();
    };
  }, [pulseAnim, dot1Anim, dot2Anim, dot3Anim]);

  const getStatusText = () => {
    switch (status) {
      case 'creating':
        return participantName
          ? `Starting conversation with ${participantName}...`
          : 'Creating conversation...';
      case 'connecting':
        return 'Establishing secure connection...';
      case 'ready':
        return 'Almost ready...';
      default:
        return 'Loading...';
    }
  };

  const dotOpacity = (animValue: Animated.Value) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        {/* Animated Spinner */}
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        >
          <ActivityIndicator size="large" color="#F05C0C" />
        </Animated.View>

        {/* Status Text */}
        <Text className="text-lg text-gray-700 mt-6 text-center font-medium">
          {getStatusText()}
        </Text>

        {/* Animated Dots */}
        <View className="flex-row items-center justify-center mt-4 space-x-2">
          <Animated.View
            style={[
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#F05C0C',
                marginHorizontal: 4,
              },
              dotOpacity(dot1Anim),
            ]}
          />
          <Animated.View
            style={[
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#F05C0C',
                marginHorizontal: 4,
              },
              dotOpacity(dot2Anim),
            ]}
          />
          <Animated.View
            style={[
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#F05C0C',
                marginHorizontal: 4,
              },
              dotOpacity(dot3Anim),
            ]}
          />
        </View>

        {/* Helper Text */}
        <Text className="text-sm text-gray-500 mt-8 text-center">
          Please wait while we set up your secure conversation
        </Text>
      </View>
    </SafeAreaView>
  );
};
