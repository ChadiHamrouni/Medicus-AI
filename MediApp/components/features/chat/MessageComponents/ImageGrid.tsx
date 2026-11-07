import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import ImagePreviewModal from './ImagePreviewModal';
import { LazyImage } from '@/components/common/LazyImage';
import { authenticatedFetch } from '@/utils';

interface ImageGridProps {
  imageUris: string[];
  maxWidth: number;
  isSending: boolean;
}

const ImageGridItem: React.FC<{
  imageUri: string;
  width: number;
  height: number;
  onPress: () => void;
  isSending: boolean;
  showOverlay?: boolean;
  overlayCount?: number;
}> = ({
  imageUri,
  width,
  height,
  onPress,
  isSending,
  showOverlay,
  overlayCount,
}) => {
  const [hasError, setHasError] = useState(false);
  const [imageSource, setImageSource] = useState<{ uri: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImageWithAuth = async () => {
      setIsLoading(true);
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
            setImageSource({ uri: base64 });
            setIsLoading(false);
            return;
          }
        }

        // For regular URIs or if auth fails, use the URI directly
        setImageSource({ uri: imageUri });
        setIsLoading(false);
      } catch {
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadImageWithAuth();
  }, [imageUri]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isSending}
      activeOpacity={0.8}
      style={{
        width,
        height,
        borderRadius: 4,
        backgroundColor: isSending ? '#E5E7EB' : '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {!hasError && imageSource && (
        <LazyImage
          source={imageSource}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
          onError={() => setHasError(true)}
          loadingSize="small"
          loadingColor="#F05C0C"
        />
      )}

      {isLoading && !imageSource && !hasError && (
        <View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(240, 240, 240, 0.9)',
          }}
        >
          <ActivityIndicator size="small" color="#F05C0C" />
        </View>
      )}

      {hasError && (
        <View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(240, 240, 240, 0.9)',
          }}
        >
          <MaterialIcons name="image-not-supported" size={24} color="#999" />
        </View>
      )}

      {showOverlay && overlayCount && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 32,
              fontWeight: '600',
            }}
          >
            +{overlayCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const ImageGrid: React.FC<ImageGridProps> = ({
  imageUris,
  maxWidth,
  isSending,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const handleImagePress = (index: number) => {
    setInitialIndex(index);
    setPreviewVisible(true);
  };

  const imageCount = imageUris.length;

  if (imageCount === 1) {
    return (
      <>
        <View style={{ marginBottom: 8 }}>
          <ImageGridItem
            imageUri={imageUris[0]}
            width={maxWidth}
            height={maxWidth * 0.75}
            onPress={() => handleImagePress(0)}
            isSending={isSending}
          />
        </View>
        <ImagePreviewModal
          visible={previewVisible}
          images={imageUris}
          initialIndex={initialIndex}
          onClose={() => setPreviewVisible(false)}
        />
      </>
    );
  }

  if (imageCount === 2) {
    const itemWidth = (maxWidth - 4) / 2;
    const itemHeight = maxWidth * 0.6;

    return (
      <>
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
            marginBottom: 8,
          }}
        >
          <ImageGridItem
            imageUri={imageUris[0]}
            width={itemWidth}
            height={itemHeight}
            onPress={() => handleImagePress(0)}
            isSending={isSending}
          />
          <ImageGridItem
            imageUri={imageUris[1]}
            width={itemWidth}
            height={itemHeight}
            onPress={() => handleImagePress(1)}
            isSending={isSending}
          />
        </View>
        <ImagePreviewModal
          visible={previewVisible}
          images={imageUris}
          initialIndex={initialIndex}
          onClose={() => setPreviewVisible(false)}
        />
      </>
    );
  }

  if (imageCount === 3) {
    const leftWidth = (maxWidth - 4) * 0.6;
    const rightWidth = (maxWidth - 4) * 0.4;
    const itemHeight = maxWidth * 0.5;
    const rightItemHeight = (itemHeight - 4) / 2;

    return (
      <>
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
            marginBottom: 8,
          }}
        >
          <ImageGridItem
            imageUri={imageUris[0]}
            width={leftWidth}
            height={itemHeight}
            onPress={() => handleImagePress(0)}
            isSending={isSending}
          />
          <View style={{ gap: 4 }}>
            <ImageGridItem
              imageUri={imageUris[1]}
              width={rightWidth}
              height={rightItemHeight}
              onPress={() => handleImagePress(1)}
              isSending={isSending}
            />
            <ImageGridItem
              imageUri={imageUris[2]}
              width={rightWidth}
              height={rightItemHeight}
              onPress={() => handleImagePress(2)}
              isSending={isSending}
            />
          </View>
        </View>
        <ImagePreviewModal
          visible={previewVisible}
          images={imageUris}
          initialIndex={initialIndex}
          onClose={() => setPreviewVisible(false)}
        />
      </>
    );
  }

  const itemWidth = (maxWidth - 4) / 2;
  const itemHeight = maxWidth * 0.45;
  const displayImages = imageUris.slice(0, 4);
  const remainingCount = imageCount - 4;

  return (
    <>
      <View style={{ marginBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
            marginBottom: 4,
          }}
        >
          <ImageGridItem
            imageUri={displayImages[0]}
            width={itemWidth}
            height={itemHeight}
            onPress={() => handleImagePress(0)}
            isSending={isSending}
          />
          <ImageGridItem
            imageUri={displayImages[1]}
            width={itemWidth}
            height={itemHeight}
            onPress={() => handleImagePress(1)}
            isSending={isSending}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
          }}
        >
          <ImageGridItem
            imageUri={displayImages[2]}
            width={itemWidth}
            height={itemHeight}
            onPress={() => handleImagePress(2)}
            isSending={isSending}
          />
          <ImageGridItem
            imageUri={displayImages[3]}
            width={itemWidth}
            height={itemHeight}
            onPress={() => handleImagePress(3)}
            isSending={isSending}
            showOverlay={remainingCount > 0}
            overlayCount={remainingCount}
          />
        </View>
      </View>
      <ImagePreviewModal
        visible={previewVisible}
        images={imageUris}
        initialIndex={initialIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </>
  );
};

export default ImageGrid;
