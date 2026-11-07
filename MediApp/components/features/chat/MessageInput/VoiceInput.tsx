import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import {
  useAudioRecorder,
  useAudioPlayer,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  runOnJS,
  cancelAnimation,
  useAnimatedReaction,
  Easing,
} from 'react-native-reanimated';
import { PlaybackInput } from './components/PlaybackInput';
import { logger } from '@/utils';

interface VoiceInputProps {
  onSend?: (
    _audioUri: string,
    _duration?: number,
    _waveform?: number[]
  ) => void;
  onCancel?: () => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'playing';

const AnimatedWaveformBar: React.FC<{ height: number; index: number }> = ({
  height,
}) => {
  const animatedHeight = useSharedValue(2);
  const animatedOpacity = useSharedValue(0.7);

  useEffect(() => {
    const targetHeight = Math.max(2, Math.min(height * 0.2, 24));
    const targetOpacity = 0.7 + (height / 100) * 0.3;

    animatedHeight.value = withSpring(targetHeight, {
      damping: 15,
      stiffness: 150,
    });

    animatedOpacity.value = withTiming(targetOpacity, {
      duration: 150,
    });
  }, [height, animatedHeight, animatedOpacity]);

  const barStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
      opacity: animatedOpacity.value,
    };
  });

  return (
    <Animated.View
      className="w-0.5 bg-gray-600 rounded-full mx-0.5"
      style={barStyle}
    />
  );
};

export const VoiceInput: React.FC<VoiceInputProps> = ({ onSend, onCancel }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isPlaybackLoading, setIsPlaybackLoading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackDuration, _setPlaybackDuration] = useState(0);
  const setPlaybackDuration = (val: number) => {
    _setPlaybackDuration(val);
  };

  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [audioUri, _setAudioUri] = useState<string | null>(null);
  const setAudioUri = (uri: string | null) => {
    _setAudioUri(uri);
  };
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  // Use HIGH_QUALITY preset for better audio capture, especially on Android
  // LOW_QUALITY can produce silent/corrupt audio on some Android devices
  const recorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY,
    status => { }
  );

  const [playerSource, setPlayerSource] = useState<string | null>(null);
  const player = useAudioPlayer(playerSource ? { uri: playerSource } : null, {
    updateInterval: 100,
  });
  player.loop = false;

  const durationIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const waveformIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | number | null>(null);

  const playbackProgress = useSharedValue(0);
  const recordingIndicatorOpacity = useSharedValue(1);

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${playbackProgress.value}%`,
    };
  });

  const recordingIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: recordingIndicatorOpacity.value,
    };
  });

  useEffect(() => {
    if (
      player.duration > 0 &&
      Math.abs(player.duration - playbackDuration) > 0.5
    ) {
      setPlaybackDuration(player.duration);
    }
  }, [player.duration, playbackDuration]);

  useEffect(() => {
    if (!player.playing && recordingState === 'playing') {
      setRecordingState('stopped');
      playbackProgress.value = 0;
      player.seekTo(0);
    }
  }, [player.playing, recordingState, playbackProgress, player]);

  useEffect(() => {
    if (player.playing && playbackProgress.value >= 0.99) {
      playbackProgress.value = 0;
    }

    if (player.playing && playbackDuration > 0) {
      const remainingTime = (1 - playbackProgress.value) * playbackDuration;

      playbackProgress.value = withTiming(1, {
        duration: remainingTime * 1000,
        easing: Easing.linear,
      });
    } else {
      cancelAnimation(playbackProgress);
    }
  }, [player.playing, playbackDuration]);

  useAnimatedReaction(
    () => playbackProgress.value,
    (currentProgress, previousProgress) => {
      if (currentProgress !== previousProgress && playbackDuration > 0) {
        const currentTime = currentProgress * playbackDuration;
        runOnJS(setPlaybackPosition)(currentTime);
      }
    },
    [playbackDuration]
  );

  useEffect(() => {
    if (recordingState === 'recording') {
      recordingIndicatorOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      recordingIndicatorOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [recordingState, recordingIndicatorOpacity]);

  // Auto-start recording when component mounts
  useEffect(() => {
    const startRecordingOnMount = async () => {
      setRecordingState('recording');
      setRecordingDuration(0);
      setWaveformBars([]);

      await initializeAudio();
    };

    startRecordingOnMount();
  }, []);

  const cleanup = async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (waveformIntervalRef.current) {
      clearInterval(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    if (recorder.isRecording) {
      await recorder.stop();
    }

    if (player.playing) {
      player.pause();
    }

    setPlayerSource(null);
  };

  const initializeAudio = async () => {
    try {
      await cleanup();

      const permission = await AudioModule.requestRecordingPermissionsAsync();

      try {
        const audioDir = FileSystem.cacheDirectory + 'ExpoAudio/';
        const dirInfo = await FileSystem.getInfoAsync(audioDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(audioDir, {
            intermediates: true,
          });
        }
      } catch (dirError) {
        console.error('❌ Failed to ensure audio directory:', dirError);
      }



      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please grant microphone permission to record audio'
        );
        return;
      }

      // TEST WRITE PERMISSIONS
      try {
        const testFile = FileSystem.cacheDirectory + 'test_write.txt';
        await FileSystem.writeAsStringAsync(testFile, 'test content');
        const readBack = await FileSystem.readAsStringAsync(testFile);

        await FileSystem.deleteAsync(testFile, { idempotent: true });
      } catch (writeError) {
        logger.error('❌ Write permission TEST FAILED:', writeError as Error, {
          component: 'VoiceInput',
          function: 'initializeAudio',
        });
      }

      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('Failed to set audio mode:', e);
      }

      await startRecording();
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Initialization Error',
        e instanceof Error ? e.message : 'Failed to initialize audio recording'
      );
    }
  };

  const startRecording = async () => {
    try {
      if (recorder.isRecording) {
        return;
      }

      setRecordingState('recording');
      setRecordingDuration(0);
      setWaveformBars([]);

      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch (audioModeError) {
        console.warn(
          'Failed to set audio mode in startRecording:',
          audioModeError
        );
      }

      if (recorder.prepareToRecordAsync) {
        await recorder.prepareToRecordAsync();
      }
      await recorder.record();

      setTimeout(() => { }, 500);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      startWaveformAnimation();
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Recording Error',
        e instanceof Error
          ? e.message
          : 'Failed to start recording. Please try again.'
      );
      setRecordingState('idle');
    }
  };

  const stopRecording = async () => {
    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
        waveformIntervalRef.current = null;
      }

      if (recorder.isRecording || recorder.uri) {
        try {
          await recorder.stop();
        } catch (stopError) {
          logger.error(
            '⚠️ Force stop error (might already be stopped):',
            stopError as Error,
            {
              component: 'VoiceInput',
              function: 'stopRecording',
            }
          );
        }

        try {
          await setAudioModeAsync({
            allowsRecording: false,
          });
        } catch (e) {
          console.warn('Failed to reset audio mode:', e);
        }
      }
      const uri = recorder.uri;

      if (uri) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));

          const parentDir = uri.substring(0, uri.lastIndexOf('/'));

          try {
            const dirInfo = await FileSystem.getInfoAsync(parentDir);
            if (!dirInfo.exists) {
              logger.error('❌ Parent directory does not exist!');
            } else {
              const files = await FileSystem.readDirectoryAsync(parentDir);

              const fileName = uri.substring(uri.lastIndexOf('/') + 1);
              if (files.includes(fileName)) {
                const fileInfo = await FileSystem.getInfoAsync(uri);
              } else {
                logger.warn(
                  '❌ File NOT found in directory listing. Expected:',
                  {
                    component: 'Voice Input',
                    fileName,
                  }
                );
              }
            }
          } catch (dirError) {
            console.error('❌ Error inspecting directory:', dirError);
          }
        } catch (fsError) {
          console.error('❌ Error in new file inspection block:', fsError);
        }
      }

      if (!uri) {
        Alert.alert('Error', 'Failed to save recording. Please try again.');
        setRecordingState('idle');
        return;
      }

      setAudioUri(uri);
      setRecordingState('stopped');

      const finalDuration =
        recorder.currentTime > 0 ? recorder.currentTime : recordingDuration;
      setPlaybackDuration(finalDuration);

      const staticWaveform = Array.from(
        { length: 25 },
        () => Math.random() * 100
      );
      setWaveformBars(staticWaveform);

      setPlayerSource(uri);
    } catch (e) {
      console.error('Failed to stop recording in VoiceInput:', e);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  const pauseRecording = async () => {
    try {
      // Pause the timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Pause waveform animation
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
        waveformIntervalRef.current = null;
      }

      // Pause the actual recording
      if (recorder.isRecording) {
        await recorder.pause();
      }

      setRecordingState('paused');
    } catch (e) {
      console.error('Failed to pause recording:', e);
    }
  };

  const resumeRecording = async () => {
    try {
      setRecordingState('recording');

      // Resume the actual recording
      if (!recorder.isRecording) {
        await recorder.record();
      }

      // Restart the timer from current duration
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Restart waveform animation
      startWaveformAnimation();
    } catch (e) {
      console.error('Failed to resume recording:', e);
      Alert.alert(
        'Resume Error',
        'Failed to resume recording. Please try again.'
      );
      setRecordingState('paused');
    }
  };

  const startWaveformAnimation = () => {
    waveformIntervalRef.current = setInterval(() => {
      const newBars = Array.from({ length: 25 }, () => Math.random() * 100);
      setWaveformBars(newBars);
    }, 150);
  };

  const togglePlayback = async () => {
    try {
      if (recordingState === 'playing') {
        setIsPlaybackLoading(true);
        player.pause();
        setIsPlaybackLoading(false);
        setRecordingState('stopped');
      } else {
        setIsPlaybackLoading(true);
        try {
          setRecordingState('playing');

          if (playbackProgress.value >= 0.99) {
            playbackProgress.value = 0;
            await player.seekTo(0);
          }
          player.play();
        } finally {
          setIsPlaybackLoading(false);
        }
      }
    } catch {
      setRecordingState('stopped');
    }
  };

  const handleDelete = async () => {
    await cleanup();
    setRecordingState('idle');
    setRecordingDuration(0);
    setPlaybackDuration(0);
    setPlaybackPosition(0);
    setAudioUri(null);
    setPlayerSource(null);
    setWaveformBars([]);

    if (onCancel) {
      onCancel();
    }
  };

  const handleMicPress = async () => {
    if (recordingState === 'recording') {
      // Pause instead of stop
      await pauseRecording();
    } else if (recordingState === 'paused') {
      // Resume recording
      await resumeRecording();
    } else if (recordingState === 'idle' || recordingState === 'stopped') {
      setRecordingState('recording');
      setRecordingDuration(0);
      setWaveformBars([]);

      await initializeAudio();
    }
  };

  const handleSend = async () => {
    // If recording is in progress or paused, stop it first and send immediately
    if (recordingState === 'recording' || recordingState === 'paused') {
      try {
        // Stop the recording intervals
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        if (waveformIntervalRef.current) {
          clearInterval(waveformIntervalRef.current);
          waveformIntervalRef.current = null;
        }

        // Stop the recorder
        if (recorder.isRecording) {
          await recorder.stop();
        }

        // Get the URI from the recorder
        const uri = recorder.uri;

        if (uri && onSend) {
          // Calculate final duration
          const finalDuration = recorder.currentTime > 0 ? recorder.currentTime : recordingDuration;

          // Create static waveform
          const staticWaveform = Array.from(
            { length: 25 },
            () => Math.random() * 100
          );

          // Send immediately
          onSend(uri, finalDuration * 1000, staticWaveform);

          // Reset state
          setPlayerSource(null);
          setAudioUri(null);
          setRecordingDuration(0);
          setPlaybackDuration(0);
          setPlaybackPosition(0);
          setRecordingState('idle');
          setWaveformBars([]);
        }
      } catch (e) {
        console.error('Failed to send recording:', e);
      }
      return;
    }

    // Normal send for stopped recordings
    if (audioUri && onSend) {
      if (player.playing) {
        try {
          player.pause();
        } catch { }
      }

      onSend(audioUri, playbackDuration * 1000, waveformBars);

      setPlayerSource(null);
      setAudioUri(null);
      setRecordingDuration(0);
      setPlaybackDuration(0);
      setPlaybackPosition(0);
      setRecordingState('idle');
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-white rounded-3xl mx-2 min-h-[60px]">
      <View className="h-12 px-3 py-1">
        {/* Recording State */}
        {recordingState === 'recording' && (
          <View className="h-full">
            {/* Recording indicator and duration */}
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center">
                <Animated.View
                  className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"
                  style={recordingIndicatorStyle}
                />
                <Text className="text-red-500 text-xs font-medium">
                  Recording
                </Text>
              </View>
              <Text className="text-sm text-gray-800 font-mono font-semibold">
                {formatTime(recordingDuration * 1000)}
              </Text>
            </View>

            {/* Waveform Animation */}
            <View className="flex-1 justify-center">
              <View className="flex-row items-center justify-center h-6">
                {waveformBars.map((height, index) => (
                  <AnimatedWaveformBar
                    key={index}
                    height={height}
                    index={index}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Paused State */}
        {recordingState === 'paused' && (
          <View className="h-full">
            {/* Paused indicator and duration */}
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5" />
                <Text className="text-orange-600 text-xs font-medium">
                  Paused
                </Text>
              </View>
              <Text className="text-sm text-gray-800 font-mono font-semibold">
                {formatTime(recordingDuration * 1000)}
              </Text>
            </View>

            {/* Static Waveform */}
            <View className="flex-1 justify-center">
              <View className="flex-row items-center justify-center h-6">
                {waveformBars.map((height, index) => (
                  <View
                    key={index}
                    className="w-0.5 bg-gray-400 rounded-full mx-0.5"
                    style={{ height: Math.max(2, Math.min(height * 0.2, 24)) }}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Playback Controls */}
        {audioUri &&
          (recordingState === 'stopped' || recordingState === 'playing') && (
            <PlaybackInput
              recordingDuration={playbackDuration}
              playbackPosition={playbackPosition}
              progress={playbackProgress}
              isPlaying={recordingState === 'playing'}
              isFinished={playbackPosition >= playbackDuration - 0.1}
              onPlayPause={togglePlayback}
            />
          )}


      </View>

      {/* Bottom Controls Bar */}
      <View className="flex-row items-center justify-between px-3 h-14">
        <TouchableOpacity
          onPress={handleDelete}
          className="p-1 rounded-full"
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleMicPress}
          className={`p-2 rounded-full ${recordingState === 'recording' ? 'bg-red-500' : 'bg-[#F05C0C]'
            }`}
          activeOpacity={0.8}
        >
          <Ionicons
            name={
              recordingState === 'recording'
                ? 'pause'
                : recordingState === 'paused'
                  ? 'mic'
                  : 'mic'
            }
            size={20}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSend}
          className="p-1 rounded-full"
          disabled={recordingState === 'idle' && !audioUri}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send"
            size={18}
            color={
              recordingState !== 'idle' || audioUri ? '#F05C0C' : '#D1D5DB'
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
