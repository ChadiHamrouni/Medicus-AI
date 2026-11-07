import React, { useState, useCallback } from 'react';
import {
  Image,
  View,
  ActivityIndicator,
  ImageProps,
  StyleSheet,
} from 'react-native';

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  fallbackSource?: number;
  loadingSize?: 'small' | 'large';
  loadingColor?: string;
  containerClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  fallbackSource,
  loadingSize = 'small',
  loadingColor = '#F05C0C',
  containerClassName = '',
  style,
  ...imageProps
}) => {
  const [isLoading, setIsLoading] = useState(
    typeof source === 'object' && 'uri' in source
  );
  const [hasError, setHasError] = useState(false);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (hasError && fallbackSource) {
    return <Image source={fallbackSource} style={style} {...imageProps} />;
  }

  return (
    <View className={containerClassName} style={style}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...imageProps}
      />
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <ActivityIndicator size={loadingSize} color={loadingColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});

export default LazyImage;
