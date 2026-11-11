import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';

export default function PdfViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const uri = params.uri as string;
  const title = params.title as string;

  // iOS: WebView renders PDFs natively. Android's WebView cannot, so remote PDFs open in the
  // system browser tab, which hands them to the device's PDF viewer. Medical documents are never
  // sent to a third-party viewing service.
  const openExternally = Platform.OS === 'android' && !!uri?.startsWith('http');
  const source = { uri };

  useEffect(() => {
    if (!openExternally) return;
    WebBrowser.openBrowserAsync(uri)
      .catch(error => console.warn('Could not open PDF: ', error))
      .finally(() => router.back());
  }, [openExternally, uri, router]);

  if (!uri) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-gray-500">No PDF URI provided</Text>
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
          onPress={() => router.back()}
          className="mr-3 p-1 rounded-full active:bg-gray-100"
        >
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text
          className="flex-1 text-lg font-semibold text-gray-900"
          numberOfLines={1}
        >
          {title || 'Document Viewer'}
        </Text>
      </View>

      {/* WebView */}
      <View className="flex-1 bg-gray-100">
        {openExternally ? (
          <View className="flex-1 justify-center items-center bg-white">
            <ActivityIndicator size="large" color="#F05C0C" />
          </View>
        ) : (
        <WebView
          source={source}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          startInLoadingState={true}
          renderLoading={() => (
            <View className="absolute inset-0 justify-center items-center bg-white">
              <ActivityIndicator size="large" color="#F05C0C" />
            </View>
          )}
          onError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
        />
        )}
      </View>
    </SafeAreaView>
  );
}
