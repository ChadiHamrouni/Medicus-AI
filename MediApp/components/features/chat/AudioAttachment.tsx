import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import { Attachment } from '@/types';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
  Easing,
} from 'react-native-reanimated';

const AnimatedProgressBar: React.FC<{ progress: SharedValue<number> }> = ({
  progress,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
      backgroundColor: '#F05C0C',
      height: '100%',
      borderRadius: 9999,
    };
  });

  return <Animated.View style={animatedStyle} />;
};

type AudioAttachmentProps = {
  attachment: Attachment;
  isSending: boolean;
  conversationId?: string;
};

const AudioAttachment: React.FC<AudioAttachmentProps> = ({
  attachment,
  isSending,
  conversationId,
}) => {
  const [loadError, setLoadError] = useState(false);
  const [source, setSource] = useState<AudioSource | null>(null);

  const progress = useSharedValue(0);

  useEffect(() => {
    const prepareAudioSource = async () => {
      let jwtToken: string | null = null;
      try {
        let audioUri =
          attachment.remoteUri || attachment.localUri || attachment.uri;

        if (
          typeof audioUri === 'string' &&
          audioUri.startsWith('ME') &&
          audioUri.length === 34 &&
          conversationId
        ) {
          try {
            const { tokenStorage, env } = await import('@/utils');
            jwtToken = await tokenStorage.getAccessToken();

            if (jwtToken) {
              const originalMediaSid = audioUri;
              const streamUrl = `${env.medicusConvoApiBaseUrl}/conversations/${conversationId}/media/${originalMediaSid}/stream`;
              audioUri = streamUrl;
            }
          } catch (fetchError) {
            console.warn(
              '🎵 AudioAttachment: Error fetching media URL:',
              fetchError
            );
          }
        }

        if (!audioUri) {
          throw new Error('No audio URI available');
        }

        const { env } = await import('@/utils');
        const audioSource: AudioSource =
          typeof audioUri === 'string' &&
          audioUri.includes(env?.medicusConvoApiBaseUrl || '') &&
          jwtToken
            ? {
                uri: audioUri,
                headers: {
                  Authorization: `Bearer ${jwtToken}`,
                },
              }
            : { uri: audioUri };

        setSource(audioSource);
      } catch (error) {
        console.error('🎵 AudioAttachment: Error loading audio:', error);
        setLoadError(true);
      }
    };

    prepareAudioSource();
  }, [
    attachment.uri,
    conversationId,
    attachment.remoteUri,
    attachment.localUri,
  ]);

  const player = useAudioPlayer(source, { updateInterval: 100 });
  player.loop = false;

  // Calculate duration and position safely
  const duration = player.duration;
  const position = player.currentTime;
  const isPlaying = player.playing;
  const isLoaded = !!source && duration > 0;

  useEffect(() => {
    if (duration > 0) {
      // If finished, reset progress
      if (position >= duration && !isPlaying) {
        progress.value = 1;
      } else {
        const progressValue = Math.min(position / duration, 1);
        // Animate only if playing for smoothness, otherwise jump
        if (isPlaying) {
          progress.value = withTiming(progressValue, {
            duration: 100, // Update roughly with hook updates
            easing: Easing.linear,
          });
        } else {
          progress.value = progressValue;
        }
      }
    }
  }, [position, duration, isPlaying, progress]);

  const handlePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      if (position >= duration - 0.1) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loadError) {
    return null;
  }

  return (
    <View
      className="flex-row items-center px-4 py-3 rounded-2xl"
      style={{
        marginBottom: 8,
        opacity: isSending ? 0.6 : 1,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        alignSelf: 'flex-start',
        minWidth: 260,
      }}
      pointerEvents={isSending ? 'none' : 'auto'}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: '#F05C0C' }}
      >
        <Ionicons name="mic" size={18} color="#FFFFFF" />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{
              backgroundColor: isLoaded ? '#F05C0C' : '#E5E7EB',
            }}
            onPress={handlePlayPause}
            disabled={!isLoaded}
          >
            {!isLoaded ? (
              <Ionicons name="hourglass-outline" size={16} color="#9CA3AF" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: isPlaying ? 0 : 1.5 }}
              />
            )}
          </TouchableOpacity>

          <View className="flex-row items-center">
            <Text
              className="text-xs font-semibold"
              style={{ color: '#F05C0C' }}
            >
              {formatTime(position)}
            </Text>
            <Text className="text-xs font-medium text-gray-400 mx-1">/</Text>
            <Text className="text-xs font-medium text-gray-400">
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        <View
          className="h-0.5 rounded-full overflow-hidden"
          style={{ backgroundColor: '#E5E7EB' }}
        >
          <AnimatedProgressBar progress={progress} />
        </View>
      </View>
    </View>
  );
};

export default AudioAttachment;
