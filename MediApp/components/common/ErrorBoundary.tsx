import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: (string | number)[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error for development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Report to Sentry (disabled)
    // try {
    //   const { reportError } = require('@/services/sentry');
    //   reportError(error, {
    //     componentStack: errorInfo.componentStack,
    //     errorBoundary: true,
    //   });
    // } catch (sentryError) {
    //   console.error('Failed to report error to Sentry:', sentryError);
    // }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }

    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    // Clear any pending timeouts
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    // Reset error state
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 justify-center items-center bg-gray-50 p-6">
          <View className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
            <View className="items-center mb-6">
              <Ionicons name="warning" size={48} color="#EF4444" />
              <Text className="text-xl font-bold text-gray-800 mt-4 text-center">
                Something went wrong
              </Text>
              <Text className="text-base text-gray-600 mt-2 text-center">
                We encountered an unexpected error. Please try again.
              </Text>
            </View>

            {__DEV__ && this.state.error && (
              <ScrollView className="bg-gray-100 rounded-lg p-3 mb-4 max-h-32">
                <Text className="text-xs text-gray-700 font-mono">
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text className="text-xs text-gray-600 font-mono mt-2">
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View className="space-y-3">
              <TouchableOpacity
                className="bg-[#F05C0C] rounded-lg py-3 px-6 items-center"
                onPress={this.handleRetry}
              >
                <Text className="text-white font-semibold text-base">
                  Try Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-gray-200 rounded-lg py-3 px-6 items-center"
                onPress={this.handleReload}
              >
                <Text className="text-gray-700 font-semibold text-base">
                  Reload App
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specific error boundaries for different app sections
export const ChatErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Chat Error:', error, errorInfo);
      // Sentry disabled
    }}
    fallback={
      <View className="flex-1 justify-center items-center p-6">
        <Ionicons name="chatbubble-outline" size={48} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
          Chat Unavailable
        </Text>
        <Text className="text-base text-gray-600 mt-2 text-center">
          We're having trouble loading your messages. Please try refreshing.
        </Text>
      </View>
    }
  >
    {children}
  </ErrorBoundary>
);

export const ConversationErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Conversation Error:', error, errorInfo);
      // Sentry disabled
    }}
    fallback={
      <View className="flex-1 justify-center items-center p-6">
        <Ionicons name="people-outline" size={48} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
          Conversations Unavailable
        </Text>
        <Text className="text-base text-gray-600 mt-2 text-center">
          We can't load your conversations right now. Please try again.
        </Text>
      </View>
    }
  >
    {children}
  </ErrorBoundary>
);

export const OnboardingErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Onboarding Error:', error, errorInfo);
      // Sentry disabled
    }}
    fallback={
      <View className="flex-1 justify-center items-center p-6">
        <Ionicons name="person-add-outline" size={48} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
          Setup Unavailable
        </Text>
        <Text className="text-base text-gray-600 mt-2 text-center">
          We're having trouble with the setup process. Please try again.
        </Text>
      </View>
    }
  >
    {children}
  </ErrorBoundary>
);
