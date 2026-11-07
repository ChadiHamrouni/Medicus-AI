/**
 * Unified Loading Screen Component
 * Provides a single loading experience for all route guards
 */

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  backgroundColor?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  backgroundColor = '#FFFFFF',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
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

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor,
        width,
        height,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
          }}
        >
          <Animated.View
            style={{
              marginBottom: 40,
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
            }}
          >
            <Image
              source={require('../../assets/images/taskify.png')}
              style={{
                width: 120,
                height: 120,
                resizeMode: 'contain',
              }}
            />
          </Animated.View>

          <View
            style={{
              marginBottom: 32,
            }}
          >
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        </Animated.View>
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map(index => (
          <Animated.View
            key={index}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#FF6B35',
              marginHorizontal: 6,
              opacity: fadeAnim,
              transform: [
                {
                  scale: pulseAnim,
                },
              ],
            }}
          />
        ))}
      </View>
    </View>
  );
};
