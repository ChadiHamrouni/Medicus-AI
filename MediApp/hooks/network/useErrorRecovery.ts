import { useCallback, useState } from 'react';
import { showErrorModal } from '@/utils';

interface ErrorRecoveryOptions {
  retryLimit?: number;
  onRetryLimitExceeded?: () => void;
  shouldRetry?: (error: Error) => boolean;
}

export const useErrorRecovery = (options: ErrorRecoveryOptions = {}) => {
  const { retryLimit = 3, onRetryLimitExceeded, shouldRetry } = options;
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleError = useCallback(
    async (error: Error, retryAction?: () => Promise<void> | void) => {
      console.error('Error occurred:', error);

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        showErrorModal('Error', error.message);
        return;
      }

      // Check retry limit
      if (retryCount >= retryLimit) {
        if (onRetryLimitExceeded) {
          onRetryLimitExceeded();
        } else {
          showErrorModal(
            'Multiple Failures',
            'We encountered repeated errors. Please restart the app or contact support.'
          );
        }
        return;
      }

      // Attempt recovery if retry action is provided
      if (retryAction) {
        setIsRecovering(true);
        try {
          await retryAction();
          setRetryCount(0); // Reset on successful retry
        } catch (retryError) {
          setRetryCount(prev => prev + 1);
          console.error('Retry failed:', retryError);

          // Show error after failed retry
          showErrorModal(
            'Retry Failed',
            retryError instanceof Error
              ? retryError.message
              : 'Unknown error occurred'
          );
        } finally {
          setIsRecovering(false);
        }
      } else {
        // No retry action, just show error
        showErrorModal('Error', error.message);
      }
    },
    [retryCount, retryLimit, onRetryLimitExceeded, shouldRetry]
  );

  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
  }, []);

  return {
    handleError,
    isRecovering,
    retryCount,
    resetRetryCount,
    canRetry: retryCount < retryLimit,
  };
};

export const useNetworkErrorRecovery = () => {
  return useErrorRecovery({
    retryLimit: 5,
    shouldRetry: (error: Error) => {
      // Retry most network errors
      return (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('connection')
      );
    },
  });
};
