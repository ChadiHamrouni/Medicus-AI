import { ErrorBoundary } from '@/components/common/ErrorBoundary';
// import { reportError } from '@/services';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

// Dependents-specific error boundary
const DependentsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Sentry disabled
      console.error('Dependents error:', error, errorInfo);
    }}
    fallback={
      <View className="flex-1 justify-center items-center p-6 bg-white">
        <MaterialCommunityIcons
          name="account-group"
          size={48}
          color="#EF4444"
        />
        <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
          Family Management Unavailable
        </Text>
        <Text className="text-base text-gray-600 mt-2 text-center">
          We&apos;re having trouble loading your family members. Please try
          again.
        </Text>
      </View>
    }
  >
    {children}
  </ErrorBoundary>
);

export default function DependentsLayout() {
  return (
    <DependentsErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="edit/[id]"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="details/[id]" />
      </Stack>
    </DependentsErrorBoundary>
  );
}
