import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface AISummaryButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const AISummaryButton: React.FC<AISummaryButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
}) => {
  return (
    <View className="absolute bottom-20 left-4 right-4 z-10">
      <TouchableOpacity
        className={`bg-blue-500 shadow-lg rounded-full px-6 py-3 flex-row items-center justify-center mx-4 ${
          disabled || loading ? 'opacity-50' : ''
        }`}
        onPress={onPress}
        disabled={disabled || loading}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="white" className="mr-2" />
            <Text className="text-white font-medium">Getting Summary...</Text>
          </>
        ) : (
          <>
            <Text className="text-white font-medium mr-2">✨</Text>
            <Text className="text-white font-medium">Get AI Summary</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
