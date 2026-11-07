import { authenticatedFetch } from '@/utils';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ImagePreviewModalProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadedImages, setLoadedImages] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (visible && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: currentIndex * SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [visible, currentIndex]);

  useEffect(() => {
    const loadImagesWithAuth = async () => {
      const newLoadedImages: Record<number, string> = {};

      for (let i = 0; i < images.length; i++) {
        const imageUri = images[i];
        try {
          // Check if this is a MedicusConvo stream URL that needs auth
          if (imageUri.includes('/media/') && imageUri.includes('/stream')) {
            const response = await authenticatedFetch(imageUri);

            if (response.ok) {
              const blob = await response.blob();
              const base64 = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              newLoadedImages[i] = base64;
              continue;
            }
          }

          // For regular URIs or if auth fails, use the URI directly
          newLoadedImages[i] = imageUri;
        } catch {
          // Fallback to original URI
          newLoadedImages[i] = imageUri;
        }
      }

      setLoadedImages(newLoadedImages);
    };

    if (visible && images.length > 0) {
      loadImagesWithAuth();
    }
  }, [visible, images]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleSaveImage = async () => {
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

      const imageUri = loadedImages[currentIndex];
      if (!imageUri) {
        Alert.alert('Error', 'Image not available');
        setIsSaving(false);
        return;
      }

      // If it's a base64 image, we need to save it to a temporary file first
      let fileUri = imageUri;
      if (imageUri.startsWith('data:')) {
        const fileName = `image_${Date.now()}.jpg`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        const base64Data = imageUri.split(',')[1];
        await FileSystem.writeAsStringAsync(filePath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileUri = filePath;
      } else if (imageUri.startsWith('http')) {
        const fileName = `image_${Date.now()}.jpg`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        const downloadResult = await FileSystem.downloadAsync(
          imageUri,
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

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
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
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
            {currentIndex + 1} / {images.length}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity
              onPress={handleSaveImage}
              activeOpacity={0.7}
              disabled={isSaving}
              style={{ opacity: isSaving ? 0.5 : 1 }}
            >
              <MaterialIcons
                name={isSaving ? 'hourglass-empty' : 'download'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Gallery */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {images.map((_, index) => (
            <View
              key={index}
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loadedImages[index] ? (
                <Image
                  source={{ uri: loadedImages[index] }}
                  style={{
                    width: SCREEN_WIDTH,
                    height: SCREEN_HEIGHT * 0.8,
                  }}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={{
                    width: SCREEN_WIDTH,
                    height: SCREEN_HEIGHT * 0.8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons name="image" size={48} color="#666" />
                  <Text style={{ color: '#999', marginTop: 10 }}>
                    Loading...
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default ImagePreviewModal;
