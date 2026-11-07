import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioWaveform } from './AudioWaveform';
import { formatTime } from '../utils';

interface RecordingUIProps {
  recordingDuration: number;
  audioLevels: number[];
  isPaused: boolean;
  pulseAnim: Animated.Value;
  onPauseResume: () => void;
}

/**
 * Component for displaying the recording UI with waveform and controls
 */
export const RecordingInput: React.FC<RecordingUIProps> = ({
  recordingDuration,
  audioLevels,
  isPaused,
  pulseAnim,
  onPauseResume,
}) => {
  return (
    <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2">
      {/* Timer with pulsing animation */}
      <View className="flex-row items-center">
        <Animated.Text
          style={{
            fontSize: 12,
            color: '#F05C0C',
            fontWeight: '500',
            minWidth: 40,
            transform: [{ scale: isPaused ? 1 : pulseAnim }],
          }}
        >
          {formatTime(recordingDuration)}
        </Animated.Text>
        {!isPaused && (
          <Animated.View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#EF4444',
              transform: [{ scale: pulseAnim }],
            }}
          />
        )}
      </View>

      {/* Waveform */}
      <View className="flex-1 h-8 justify-center">
        <AudioWaveform
          isRecording={!isPaused}
          audioLevels={audioLevels}
          color={isPaused ? '#9CA3AF' : '#F05C0C'}
          height={30}
          barWidth={3}
          barGap={2}
        />
      </View>

      {/* Pause/Resume button */}
      <TouchableOpacity
        className="w-[30px] h-[30px] rounded-full bg-gray-100 justify-center items-center ml-2 border border-gray-200"
        onPress={onPauseResume}
      >
        <Ionicons
          name={isPaused ? 'play' : 'pause'}
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>
    </View>
  );
};
