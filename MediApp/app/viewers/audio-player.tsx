import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system/legacy';

export default function AudioPlayerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const uri = params.uri as string;
    const title = params.title as string;
    const mimeType = params.mimeType as string;

    const [source, setSource] = useState<AudioSource | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [audioReady, setAudioReady] = useState(false);

    useEffect(() => {
        if (uri) {
            downloadAndSetSource();
        }
    }, [uri]);

    const getFileExtension = (mimeType?: string, uri?: string): string => {
        if (mimeType) {
            if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') return 'm4a';
            if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3') return 'mp3';
            if (mimeType === 'audio/wav') return 'wav';
            if (mimeType === 'audio/ogg') return 'ogg';
            const parts = mimeType.split('/');
            if (parts.length === 2) {
                const ext = parts[1].toLowerCase();
                if (['m4a', 'mp3', 'wav', 'ogg', 'aac'].includes(ext)) {
                    return ext;
                }
            }
        }

        if (uri) {
            if (uri.includes('.m4a')) return 'm4a';
            if (uri.includes('.mp3')) return 'mp3';
            if (uri.includes('.wav')) return 'wav';
            if (uri.includes('.ogg')) return 'ogg';
        }

        return 'm4a';
    };

    const downloadAndSetSource = async () => {
        try {
            setIsDownloading(true);
            setError(null);
            setAudioReady(false);

            const fileExtension = getFileExtension(mimeType, uri);
            const fileName = `audio_${Date.now()}.${fileExtension}`;
            const localUri = `${FileSystem.cacheDirectory}${fileName}`;


            const cachedInfo = await FileSystem.getInfoAsync(localUri);
            if (cachedInfo.exists) {
                setSource({ uri: localUri });
                setIsDownloading(false);
                return;
            }

            const downloadResult = await FileSystem.downloadAsync(uri, localUri);

            if (downloadResult.status === 200) {
                setSource({ uri: downloadResult.uri });
            } else {
                setError(`Failed to download audio file (Status: ${downloadResult.status})`);
            }
        } catch (err) {
            setError(`Failed to load audio: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const player = useAudioPlayer(source, { updateInterval: 250 });
    player.loop = false;

    // Force re-render when player duration loads
    useEffect(() => {
        if (player.duration > 0 && source && !audioReady) {
            setAudioReady(true);
        }
    }, [player.duration, source, audioReady]);


    // Optimized updates for smooth 60 FPS progress
    const [updateTrigger, setUpdateTrigger] = useState(0);
    useEffect(() => {
        if (!audioReady) return;

        const interval = setInterval(() => {
            setUpdateTrigger(prev => prev + 1);
        }, 16); // 60 FPS

        return () => clearInterval(interval);
    }, [audioReady]);

    const duration = player.duration;
    const position = player.currentTime;
    const isPlaying = player.playing;

    const isLoaded = audioReady && !!source && player.duration > 0 && !isDownloading;

    const handlePlayPause = () => {
        if (isPlaying) {
            player.pause();
        } else {
            if (position >= duration - 0.5) {
                player.seekTo(0);
            }
            player.play();
        }
    };

    const handleSeek = (value: number) => {
        player.seekTo(value);
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (!uri) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <Text className="text-gray-500">No audio URI provided</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 p-2 bg-gray-200 rounded"
                >
                    <Text>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center p-4 border-b border-gray-200">
                <TouchableOpacity
                    onPress={() => {
                        player.pause();
                        router.back();
                    }}
                    className="mr-3 p-1 rounded-full active:bg-gray-100"
                >
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
                <Text
                    className="flex-1 text-lg font-semibold text-gray-900"
                    numberOfLines={1}
                >
                    {title || 'Audio Player'}
                </Text>
            </View>

            {/* Content */}
            <View className="flex-1 justify-center items-center px-8">
                <View className="w-64 h-64 bg-gray-50 rounded-3xl justify-center items-center mb-10 shadow-sm border border-gray-100">
                    <MaterialCommunityIcons name="music-note" size={100} color="#F05C0C" style={{ opacity: 0.8 }} />
                </View>

                {/* Title */}
                <Text className="text-xl font-bold text-gray-900 text-center mb-1 px-4" numberOfLines={2}>
                    {title || 'Audio File'}
                </Text>
                <Text className="text-sm text-gray-500 mb-2">Audio Recording</Text>

                {/* Error Message */}
                {error && (
                    <Text className="text-sm text-red-500 mb-8 px-4 text-center">{error}</Text>
                )}

                {/* Debug Info */}
                {/* {!isLoaded && !error && (
                    <View className="mb-8 px-4">
                        <Text className="text-xs text-gray-400 mb-2 text-center">
                            {isDownloading ? 'Downloading audio...' : `Loading audio... (Duration: ${duration})`}
                        </Text>
                        {!isDownloading && (
                            <Text className="text-xs text-gray-300 text-center" numberOfLines={2}>
                                URI: {uri.substring(0, 80)}...
                            </Text>
                        )}
                    </View>
                )} */}

                {/* Controls Container */}
                <View className="w-full">
                    {/* Progress Slider */}
                    <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={0}
                        maximumValue={duration > 0 ? duration : 100}
                        value={player.currentTime}
                        onSlidingComplete={handleSeek}
                        minimumTrackTintColor="#F05C0C"
                        maximumTrackTintColor="#E5E7EB"
                        thumbTintColor="#F05C0C"
                        disabled={!isLoaded}
                    />

                    {/* Time Labels */}
                    <View className="flex-row justify-between px-1 mt-1">
                        <Text className="text-xs text-gray-500 font-medium">{formatTime(player.currentTime)}</Text>
                        <Text className="text-xs text-gray-500 font-medium">{formatTime(duration)}</Text>
                    </View>

                    {/* Play/Pause Main Control */}
                    <View className="flex-row justify-center items-center mt-8">
                        <TouchableOpacity
                            onPress={handlePlayPause}
                            disabled={!isLoaded}
                            className="w-20 h-20 rounded-full justify-center items-center shadow-md bg-[#F05C0C]"
                            activeOpacity={0.8}
                        >
                            {!isLoaded ? (
                                <ActivityIndicator color="white" size="large" />
                            ) : (
                                <Ionicons
                                    name={player.playing ? 'pause' : 'play'}
                                    size={40}
                                    color="white"
                                    style={{ marginLeft: player.playing ? 0 : 4 }}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
