import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCountdownTimerProps {
  initialTime?: number;
  onComplete?: () => void;
}

export const useCountdownTimer = ({
  initialTime = 60,
  onComplete,
}: UseCountdownTimerProps = {}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<number | NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    // Clear any existing timer
    clearTimer();

    // Set initial time and running state
    setTimeLeft(initialTime);
    setIsRunning(true);

    // Start the interval
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearTimer();
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [initialTime, clearTimer, onComplete]);

  const stopTimer = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(initialTime);
    setIsRunning(false);
  }, [clearTimer, initialTime]);

  return {
    timeLeft,
    isRunning,
    startTimer,
    stopTimer,
    resetTimer,
  };
};
