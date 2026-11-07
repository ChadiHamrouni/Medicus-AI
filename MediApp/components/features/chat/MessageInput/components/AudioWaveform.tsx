import React, { useEffect, useRef } from 'react';
import { View, Dimensions, Animated } from 'react-native';

interface AudioWaveformProps {
  isRecording: boolean;
  isPlaying?: boolean;
  audioLevels?: number[];
  playbackPosition?: number;
  duration?: number;
  color?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  maxBars?: number;
}

/**
 * AudioWaveform component to visualize audio recording levels
 */
export const AudioWaveform = ({
  isRecording,
  isPlaying = false,
  audioLevels = [],
  playbackPosition = 0,
  duration = 0,
  color = '#F05C0C',
  height = 40,
  barWidth = 3,
  barGap = 2,
  maxBars = 30,
}: AudioWaveformProps) => {
  const animatedValues = useRef<Animated.Value[]>([]);

  // Calculate the number of bars that can fit in the screen width
  const screenWidth = Dimensions.get('window').width - 40; // Subtract padding
  const barsPerScreen = Math.min(
    maxBars,
    Math.floor(screenWidth / (barWidth + barGap))
  );

  // Initialize animated values if they don't exist or count changed
  useEffect(() => {
    if (animatedValues.current.length !== barsPerScreen) {
      animatedValues.current = Array(barsPerScreen)
        .fill(0)
        .map(() => new Animated.Value(0.1));
    }
  }, [barsPerScreen]);

  // Update animated values when audio levels change
  useEffect(() => {
    if ((!isRecording && !isPlaying) || audioLevels.length === 0) {
      return;
    }

    // Update the animated values with real audio levels
    audioLevels.forEach((level, index) => {
      if (index < animatedValues.current.length) {
        // Use different animation based on recording vs playback
        if (isRecording) {
          Animated.spring(animatedValues.current[index], {
            toValue: level,
            friction: 6,
            tension: 40,
            useNativeDriver: false,
          }).start();
        } else if (isPlaying) {
          // During playback, animate with a slight bounce effect
          Animated.sequence([
            Animated.timing(animatedValues.current[index], {
              toValue: level * 0.8,
              duration: 100,
              useNativeDriver: false,
            }),
            Animated.spring(animatedValues.current[index], {
              toValue: level,
              friction: 3,
              tension: 40,
              useNativeDriver: false,
            }),
          ]).start();
        }
      }
    });

    // For any remaining bars, use the last level or a default
    const lastLevel = audioLevels[audioLevels.length - 1] || 0.1;
    for (let i = audioLevels.length; i < animatedValues.current.length; i++) {
      Animated.spring(animatedValues.current[i], {
        toValue: lastLevel,
        friction: 6,
        tension: 40,
        useNativeDriver: false,
      }).start();
    }
  }, [isRecording, isPlaying, audioLevels]);

  // Reset animation when recording stops and not playing
  useEffect(() => {
    if (!isRecording && !isPlaying) {
      // Reset all bars to minimum height
      animatedValues.current.forEach(animValue => {
        Animated.spring(animValue, {
          toValue: 0.1,
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isRecording, isPlaying]);

  // Generate default waveform pattern if no audio levels are provided
  useEffect(() => {
    let interval: NodeJS.Timeout | number | null = null;

    // If we have no audio levels, generate random ones
    if (!audioLevels || audioLevels.length === 0) {
      const generateRandomLevels = () => {
        const randomLevels = [];
        for (let i = 0; i < animatedValues.current.length; i++) {
          const position = i / animatedValues.current.length;
          const distanceFromCenter = Math.abs(position - 0.5) * 2;
          const baseHeight = 0.3 + (1 - distanceFromCenter) * 0.5;
          const randomFactor = 0.2;

          const level =
            baseHeight + (Math.random() * randomFactor - randomFactor / 2);
          randomLevels.push(Math.max(0.1, Math.min(1, level)));
        }
        return randomLevels;
      };

      // Apply the random levels
      const randomLevels = generateRandomLevels();
      randomLevels.forEach((level, index) => {
        if (index < animatedValues.current.length) {
          Animated.spring(animatedValues.current[index], {
            toValue: level,
            friction: 6,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      });

      // If recording or playing, animate the waveform
      if (isRecording || isPlaying) {
        interval = setInterval(
          () => {
            animatedValues.current.forEach((animValue, index) => {
              const position = index / animatedValues.current.length;
              const distanceFromCenter = Math.abs(position - 0.5) * 2;
              const baseHeight = 0.3 + (1 - distanceFromCenter) * 0.5;

              const randomValue = isRecording
                ? 0.1 + Math.random() * 0.9
                : baseHeight + (Math.random() * 0.3 - 0.15);

              Animated.spring(animValue, {
                toValue: randomValue,
                friction: isRecording ? 6 : 8,
                tension: isRecording ? 40 : 30,
                useNativeDriver: false,
              }).start();
            });
          },
          isRecording ? 150 : 250
        );
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, isPlaying, audioLevels]);

  // Calculate which bars should be highlighted based on playback position
  const getBarHighlight = (index: number, totalBars: number) => {
    if (!isPlaying || duration <= 0) return 1;

    const positionPercent = playbackPosition / duration;
    const highlightPosition = Math.floor(positionPercent * totalBars);

    return index <= highlightPosition ? 1 : 0.3;
  };

  return (
    <View
      className="flex-row items-center justify-center px-[5px] relative"
      style={{ height }}
    >
      {/* Audio bars */}
      {animatedValues.current.map((animValue, index) => (
        <Animated.View
          key={index}
          className="rounded-[2px]"
          style={[
            {
              backgroundColor: color,
              height: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [4, height],
              }),
              width: barWidth,
              marginHorizontal: barGap / 2,
              opacity: isPlaying
                ? getBarHighlight(index, animatedValues.current.length - 1)
                : isRecording
                  ? 1
                  : 0.7,
            },
          ]}
        />
      ))}
    </View>
  );
};
