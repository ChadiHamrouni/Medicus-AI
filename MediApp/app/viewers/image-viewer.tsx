import { authenticatedFetch } from '@/utils';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getFileNameFromUri = (uri: string) => {
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
        const char = uri.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `cached_img_${Math.abs(hash)}.jpg`;
};

export default function ImageViewerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const uri = params.uri as string;
    const title = params.title as string;

    const [loadedImage, setLoadedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Zoom State
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value !== 1) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = withTiming(2);
                savedScale.value = 2;
            }
        });

    const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));

    useEffect(() => {
        const loadImageWithAuth = async () => {
            if (!uri) return;

            setIsLoading(true);
            try {
                if (uri.includes('/media/') && uri.includes('/stream')) {
                    const response = await authenticatedFetch(uri);

                    if (response.ok) {
                        const blob = await response.blob();
                        const base64 = await new Promise<string>(resolve => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                        setLoadedImage(base64);
                        setIsLoading(false);
                        return;
                    }
                }
                else if (uri.startsWith('http')) {
                    const fileName = getFileNameFromUri(uri);
                    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

                    // Check cache first
                    const fileInfo = await FileSystem.getInfoAsync(filePath);
                    if (fileInfo.exists) {
                        setLoadedImage(filePath);
                        setIsLoading(false);
                        return;
                    }

                    const result = await FileSystem.downloadAsync(uri, filePath);

                    if (result.status === 200) {
                        setLoadedImage(result.uri);
                    } else {
                        console.error("Image download failed with status", result.status);
                        setHasError(true);
                    }
                    setIsLoading(false);
                    return;
                }

                // Fallback for local URIs
                setLoadedImage(uri);
                setIsLoading(false);
            } catch (e) {
                console.error("Image loader error:", e);
                setHasError(true);
                setIsLoading(false);
            }
        };

        loadImageWithAuth();
    }, [uri]);

    const handleSaveImage = async () => {
        if (!loadedImage) return;

        try {
            setIsSaving(true);

            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant photo library access to save images.'
                );
                setIsSaving(false);
                return;
            }

            // If it's a base64 image, we need to save it to a temporary file first
            let fileUri = loadedImage;
            if (loadedImage.startsWith('data:')) {
                const fileName = `image_${Date.now()}.jpg`;
                const filePath = `${FileSystem.cacheDirectory}${fileName}`;

                const base64Data = loadedImage.split(',')[1];
                await FileSystem.writeAsStringAsync(filePath, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                fileUri = filePath;
            } else if (loadedImage.startsWith('http')) {
                const fileName = `image_${Date.now()}.jpg`;
                const filePath = `${FileSystem.cacheDirectory}${fileName}`;

                const downloadResult = await FileSystem.downloadAsync(
                    loadedImage,
                    filePath
                );
                fileUri = downloadResult.uri;
            }

            // Save to medicus library
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            await MediaLibrary.createAlbumAsync('Medicus', asset, false);

            Alert.alert('Success', 'Image saved to your photo library!');
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'Failed to save image. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!uri) {
        return (
            <SafeAreaView className="flex-1 bg-black justify-center items-center">
                <Text className="text-white">No image URI provided</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 p-2 bg-gray-800 rounded"
                >
                    <Text className="text-white">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Header */}
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    paddingTop: 50,
                    paddingHorizontal: 20,
                    paddingBottom: 15,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>

                <Text
                    style={{ color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 10 }}
                    numberOfLines={1}
                >
                    {title || 'Image Viewer'}
                </Text>

                <TouchableOpacity
                    onPress={handleSaveImage}
                    activeOpacity={0.7}
                    disabled={isSaving || isLoading || hasError}
                    style={{ opacity: (isSaving || isLoading || hasError) ? 0.5 : 1 }}
                >
                    <MaterialIcons
                        name={isSaving ? 'hourglass-empty' : 'download'}
                        size={28}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>

            {/* Image Container */}
            <GestureHandlerRootView style={{ flex: 1 }}>
                <GestureDetector gesture={composed}>
                    <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                        {loadedImage ? (
                            <Animated.Image
                                source={{ uri: loadedImage }}
                                style={[
                                    {
                                        width: SCREEN_WIDTH,
                                        height: SCREEN_HEIGHT,
                                    },
                                    animatedStyle
                                ]}
                                resizeMode="contain"
                            />
                        ) : (
                            !hasError && <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} />
                        )}
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>

            {/* Loading Overlay */}
            {isLoading && (
                <View className="absolute inset-0 justify-center items-center bg-black/50 pointer-events-none">
                    <ActivityIndicator size="large" color="#F05C0C" />
                </View>
            )}

            {/* Error State */}
            {hasError && (
                <View className="absolute inset-0 justify-center items-center pointer-events-none">
                    <MaterialIcons name="image-not-supported" size={48} color="#999" />
                    <Text style={{ marginTop: 8, color: '#999', fontWeight: '500' }}>
                        Failed to load image
                    </Text>
                </View>
            )}
        </View>
    );
}
