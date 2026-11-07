import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ErrorState {
  type: 'NETWORK' | 'SERVER' | 'VALIDATION' | 'UNKNOWN';
  message: string;
  retryable: boolean;
  timestamp: Date;
  context: string;
}

interface ErrorStateProps {
  error: ErrorState | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const getContextualErrorTitle = (context: string): string => {
  switch (context.toLowerCase()) {
    case 'loading categories':
      return 'Unable to load categories';
    case 'loading out-of-network doctors':
      return 'Unable to load additional doctors';
    case 'loading more doctors':
      return 'Unable to load more results';
    default:
      return 'Something went wrong';
  }
};

const getErrorIcon = (type: ErrorState['type']): string => {
  switch (type) {
    case 'NETWORK':
      return 'wifi-off';
    case 'SERVER':
      return 'server-network-off';
    case 'VALIDATION':
      return 'alert-circle';
    default:
      return 'alert-circle';
  }
};

export const ErrorStateDisplay: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onDismiss,
  className = 'bg-red-50 rounded-2xl p-4 mb-4',
}) => {
  if (!error) return null;

  return (
    <View className={className}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <MaterialCommunityIcons
            name={getErrorIcon(error.type) as any}
            size={20}
            color="#EF4444"
          />
          <Text className="text-red-600 font-medium ml-2 flex-1">
            {getContextualErrorTitle(error.context)}
          </Text>
        </View>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} className="p-1">
            <MaterialCommunityIcons name="close" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <Text className="text-red-500 text-sm mb-3">{error.message}</Text>

      <View className="flex-row">
        {error.retryable && onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            className="bg-red-100 px-3 py-2 rounded-lg mr-2"
          >
            <Text className="text-red-600 font-medium">Try Again</Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            className="bg-gray-100 px-3 py-2 rounded-lg"
          >
            <Text className="text-gray-600 font-medium">Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ErrorStateDisplay;
