import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { formatTime } from '../utils';

interface PlaybackUIProps {
  recordingDuration: number;
  playbackPosition: number;
  progress: SharedValue<number>;
  isPlaying: boolean;
  isFinished?: boolean;
  onPlayPause: () => void;
}

/**
 * Component for displaying the audio playback UI with waveform and controls
 */
export const PlaybackInput: React.FC<PlaybackUIProps> = ({
  recordingDuration,
  playbackPosition,
  progress,
  isPlaying,
  isFinished,
  onPlayPause,
}) => {
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  return (
    <View className="flex-1 flex-row items-center bg-gray-100 rounded-3xl px-3 py-2 mx-1">
      {/* Playback timer */}
      <View className="flex-row items-center mr-2">
        <Text
          className="text-sm font-medium mr-1.5 min-w-[40px]"
          style={{ color: '#F05C0C' }}
        >
          {isPlaying
            ? formatTime(playbackPosition)
            : formatTime(recordingDuration)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="flex-1 h-1 bg-gray-300 rounded-full overflow-hidden mx-2">
        <Animated.View
          className="h-full bg-orange-500 rounded-full"
          style={progressStyle}
        />
      </View>

      {/* Play/Pause button */}
      <TouchableOpacity
        className="w-[30px] h-[30px] rounded-full bg-gray-100 justify-center items-center ml-2 border border-gray-200"
        onPress={() => {
          onPlayPause();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isFinished ? 'refresh' : isPlaying ? 'pause' : 'play'}
          size={18}
          color="#F05C0C"
        />
      </TouchableOpacity>
    </View>
  );
};
